import asyncio
import logging
from datetime import datetime

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


async def sync_all_subscriptions():
    """Sync all active external subscriptions."""
    with GetDB() as db:
        subs = get_external_subscriptions(db, category=None)
        for sub in subs:
            if not sub.is_active:
                continue
            try:
                remove_proxy_pool_servers(db, sub.id)

                if sub.type in ("vless", "vmess", "trojan") and (
                    sub.url.startswith("vless://")
                    or sub.url.startswith("vmess://")
                    or sub.url.startswith("trojan://")
                ):
                    parsed = parse_single_link(sub.url)
                    create_proxy_pool_server(
                        db=db,
                        subscription_id=sub.id,
                        **{k: v for k, v in parsed.items() if k != "name"},
                        name=parsed.get("name") or sub.name,
                    )
                elif sub.type == "subscription":
                    resp = requests.get(sub.url, timeout=15)
                    resp.raise_for_status()
                    servers = parse_subscription(resp.text)
                    for srv in servers:
                        create_proxy_pool_server(
                            db=db,
                            subscription_id=sub.id,
                            **{k: v for k, v in srv.items() if k != "name"},
                            name=srv.get("name") or sub.name,
                        )

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
