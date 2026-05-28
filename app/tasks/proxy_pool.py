import asyncio
import logging
from datetime import datetime
from collections import defaultdict

import requests

from app.db import GetDB
from app.db.crud import (
    get_external_subscriptions,
    get_proxy_pool_servers,
    remove_proxy_pool_servers,
    create_proxy_pool_server,
)
from app.utils.subscription_parser import parse_subscription, parse_single_link

logger = logging.getLogger(__name__)


def _server_fingerprint(data: dict) -> tuple:
    return (
        data.get("protocol"),
        data.get("address"),
        data.get("port"),
        data.get("uuid"),
        data.get("password"),
        data.get("network"),
        data.get("tls"),
        data.get("sni"),
        data.get("host"),
        data.get("path"),
        data.get("pbk"),
        data.get("sid"),
        data.get("flow"),
    )


def _normalize_selected_server_ids(selected_server_ids: list[int] | None) -> list[int]:
    if not selected_server_ids:
        return []
    normalized: list[int] = []
    for server_id in selected_server_ids:
        if server_id <= 0:
            continue
        if server_id not in normalized:
            normalized.append(server_id)
    return normalized


def _restore_server_selections(sub, previous_servers: list, created_servers: list):
    previous_fingerprints = {
        srv.id: _server_fingerprint(
            {
                "protocol": srv.protocol,
                "address": srv.address,
                "port": srv.port,
                "uuid": srv.uuid,
                "password": srv.password,
                "network": srv.network,
                "tls": srv.tls,
                "sni": srv.sni,
                "host": srv.host,
                "path": srv.path,
                "pbk": srv.pbk,
                "sid": srv.sid,
                "flow": srv.flow,
            }
        )
        for srv in previous_servers
    }

    created_by_fingerprint: dict[tuple, list[int]] = defaultdict(list)
    for srv in created_servers:
        created_by_fingerprint[
            _server_fingerprint(
                {
                    "protocol": srv.protocol,
                    "address": srv.address,
                    "port": srv.port,
                    "uuid": srv.uuid,
                    "password": srv.password,
                    "network": srv.network,
                    "tls": srv.tls,
                    "sni": srv.sni,
                    "host": srv.host,
                    "path": srv.path,
                    "pbk": srv.pbk,
                    "sid": srv.sid,
                    "flow": srv.flow,
                }
            )
        ].append(srv.id)

    previous_preferred = sub.preferred_bridge_server_id
    if previous_preferred:
        preferred_fingerprint = previous_fingerprints.get(previous_preferred)
        if preferred_fingerprint and created_by_fingerprint.get(preferred_fingerprint):
            sub.preferred_bridge_server_id = created_by_fingerprint[
                preferred_fingerprint
            ][0]
        else:
            sub.preferred_bridge_server_id = None

    previous_selected_ids = _normalize_selected_server_ids(sub.selected_server_ids)
    remapped_selected_ids: list[int] = []
    for previous_id in previous_selected_ids:
        selected_fingerprint = previous_fingerprints.get(previous_id)
        if not selected_fingerprint:
            continue
        new_ids = created_by_fingerprint.get(selected_fingerprint, [])
        if not new_ids:
            continue
        mapped_id = new_ids.pop(0)
        if mapped_id not in remapped_selected_ids:
            remapped_selected_ids.append(mapped_id)

    sub.selected_server_ids = remapped_selected_ids


async def sync_all_subscriptions():
    """Sync all active external subscriptions."""
    with GetDB() as db:
        subs = get_external_subscriptions(db, category=None)
        for sub in subs:
            if not sub.is_active:
                continue
            try:
                previous_servers = get_proxy_pool_servers(db, subscription_id=sub.id)
                remove_proxy_pool_servers(db, sub.id)
                for previous_server in previous_servers:
                    try:
                        db.expunge(previous_server)
                    except Exception:
                        pass
                created_servers = []

                if sub.type in ("vless", "vmess", "trojan") and (
                    sub.url.startswith("vless://")
                    or sub.url.startswith("vmess://")
                    or sub.url.startswith("trojan://")
                ):
                    parsed = parse_single_link(sub.url)
                    created_servers.append(
                        create_proxy_pool_server(
                        db=db,
                        subscription_id=sub.id,
                        **{k: v for k, v in parsed.items() if k != "name"},
                        name=parsed.get("name") or sub.name,
                        )
                    )
                elif sub.type == "subscription":
                    resp = requests.get(
                        sub.url,
                        timeout=15,
                        headers={"User-Agent": "Marzneshin/1.0"},
                    )
                    resp.raise_for_status()
                    servers = parse_subscription(resp.text)
                    for srv in servers:
                        created_servers.append(
                            create_proxy_pool_server(
                            db=db,
                            subscription_id=sub.id,
                            **{k: v for k, v in srv.items() if k != "name"},
                            name=srv.get("name") or sub.name,
                            )
                        )

                _restore_server_selections(sub, previous_servers, created_servers)
                sub.last_sync_at = datetime.utcnow()
                db.commit()
                logger.info(f"Synced subscription {sub.id} ({sub.name})")
            except Exception as exc:
                logger.error(f"Failed to sync subscription {sub.id}: {exc}")
                db.rollback()


async def test_all_servers_latency():
    """Test latency for all proxy pool servers."""
    import socket

    with GetDB() as db:
        subs = get_external_subscriptions(db, category=None)
        all_servers = []
        for sub in subs:
            all_servers.extend(
                get_proxy_pool_servers(db, subscription_id=sub.id)
            )

        for srv in all_servers:
            if not srv.address or not srv.port:
                srv.is_available = False
                continue

            try:
                loop = asyncio.get_event_loop()
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5.0)
                start = asyncio.get_event_loop().time()
                await asyncio.wait_for(
                    loop.run_in_executor(None, sock.connect, (srv.address, srv.port)),
                    timeout=5.0,
                )
                elapsed = (asyncio.get_event_loop().time() - start) * 1000
                sock.close()
                srv.latency_ms = int(elapsed)
                srv.is_available = True
            except Exception:
                srv.latency_ms = None
                srv.is_available = False

            srv.last_tested_at = datetime.utcnow()

        db.commit()
        logger.info(f"Tested latency for {len(all_servers)} proxy pool servers")
