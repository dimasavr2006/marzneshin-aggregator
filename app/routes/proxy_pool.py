from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import crud
from app.db.models import ExternalSubscription, Admin as DBAdmin
from app.dependencies import DBDep, AdminDep
from app.models.admin import Admin
from app.models.proxy_pool import (
    ExternalSubscriptionCreate,
    ExternalSubscriptionModify,
    ExternalSubscriptionResponse,
    ProxyPoolServerResponse,
    ProxyPoolServerModify,
)
from app.utils.vless_parser import parse_vless
from app.utils.subscription_parser import parse_subscription, parse_single_link
from app.templates import render_template
from fastapi.responses import HTMLResponse
import asyncio

router = APIRouter(tags=["Proxy Pool"], prefix="/proxy-pool")


def check_subscription_owner(
    sub: ExternalSubscription, admin: Admin
):
    if not admin.is_sudo and sub.admin_id != admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not allowed to access this subscription",
        )


def _validate_bridge_subscription(
    db: Session,
    admin: Admin,
    bridge_subscription_id: int | None,
):
    """Validate that bridge subscription exists, is a bridge, and is owned by admin."""
    if bridge_subscription_id is None:
        return
    bridge_sub = crud.get_external_subscription(db, bridge_subscription_id)
    if not bridge_sub:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Bridge subscription {bridge_subscription_id} not found",
        )
    if bridge_sub.category != "bridge":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Selected subscription is not a bridge",
        )
    if not admin.is_sudo and bridge_sub.admin_id != admin.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bridge subscription does not belong to you",
        )


def _validate_preferred_server(
    db: Session,
    sub: ExternalSubscription,
    preferred_bridge_server_id: int | None,
):
    """Validate that preferred server exists and belongs to this subscription."""
    if preferred_bridge_server_id is None:
        return
    server = crud.get_proxy_pool_server(db, preferred_bridge_server_id)
    if not server:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Preferred bridge server {preferred_bridge_server_id} not found",
        )
    if server.subscription_id != sub.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Preferred bridge server does not belong to this subscription",
        )


def _normalize_selected_server_ids(
    selected_server_ids: list[int] | None,
) -> list[int]:
    if not selected_server_ids:
        return []
    normalized: list[int] = []
    for server_id in selected_server_ids:
        if server_id <= 0:
            continue
        if server_id not in normalized:
            normalized.append(server_id)
    return normalized


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


def _restore_server_selections(
    sub: ExternalSubscription,
    previous_servers: list,
    created_servers: list,
):
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


def _sync_subscription_data(db: Session, sub: ExternalSubscription):
    """Fetch and parse subscription URL, update servers."""
    previous_servers = crud.get_proxy_pool_servers(db, subscription_id=sub.id)
    crud.remove_proxy_pool_servers(db, sub.id)
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
        try:
            parsed = parse_single_link(sub.url)
            created_servers.append(
                crud.create_proxy_pool_server(
                db=db,
                subscription_id=sub.id,
                **{k: v for k, v in parsed.items() if k != "name"},
                name=parsed.get("name") or sub.name,
                )
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid proxy URL: {exc}",
            )
    elif sub.type == "subscription":
        import requests
        try:
            resp = requests.get(
                sub.url,
                timeout=15,
                headers={"User-Agent": "Marzneshin/1.0"},
            )
            resp.raise_for_status()
            servers = parse_subscription(resp.text)
            for srv in servers:
                created_servers.append(
                    crud.create_proxy_pool_server(
                    db=db,
                    subscription_id=sub.id,
                    **{k: v for k, v in srv.items() if k != "name"},
                    name=srv.get("name") or sub.name,
                    )
                )
        except requests.exceptions.Timeout:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection timeout while fetching subscription",
            )
        except requests.exceptions.ConnectionError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Connection error: unable to reach subscription URL",
            )
        except requests.exceptions.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"HTTP error from subscription URL: {exc.response.status_code}",
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to parse subscription content: {exc}",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to sync subscription: {exc}",
            )

    _restore_server_selections(sub, previous_servers, created_servers)
    from datetime import datetime
    sub.last_sync_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)


@router.post("/subscriptions", response_model=ExternalSubscriptionResponse)
def add_subscription(
    payload: ExternalSubscriptionCreate,
    db: DBDep,
    admin: AdminDep,
):
    routing_mode = payload.routing_mode
    server_selection_mode = payload.server_selection_mode
    selected_server_ids = _normalize_selected_server_ids(
        payload.selected_server_ids
    )
    if payload.category == "bridge":
        routing_mode = "via_node"
        server_selection_mode = "all"
        selected_server_ids = []
    elif server_selection_mode not in ("all", "manual", "selected"):
        server_selection_mode = "all"

    db_admin = crud.get_admin(db, admin.username)
    sub = crud.create_external_subscription(
        db=db,
        admin_id=db_admin.id,
        name=payload.name,
        url=payload.url,
        type=payload.type,
        category=payload.category,
        routing_mode=routing_mode,
        bridge_naming_template=payload.bridge_naming_template,
        preferred_bridge_server_id=payload.preferred_bridge_server_id,
        bridge_subscription_id=payload.bridge_subscription_id,
        server_selection_mode=server_selection_mode,
        selected_server_ids=selected_server_ids,
        is_active=payload.is_active,
    )

    # If it's a single proxy link, parse it immediately
    if payload.type in ("vless", "vmess", "trojan") and (
        payload.url.startswith("vless://")
        or payload.url.startswith("vmess://")
        or payload.url.startswith("trojan://")
    ):
        try:
            parsed = parse_single_link(payload.url)
            crud.create_proxy_pool_server(
                db=db,
                subscription_id=sub.id,
                **{k: v for k, v in parsed.items() if k != "name"},
                name=parsed.get("name") or payload.name,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid proxy URL: {exc}",
            )
    elif payload.type == "subscription":
        try:
            _sync_subscription_data(db, sub)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to sync subscription: {exc}",
            )

    # Validate preferred server if provided
    if payload.preferred_bridge_server_id is not None:
        _validate_preferred_server(db, sub, payload.preferred_bridge_server_id)

    # Validate bridge subscription if provided
    if payload.bridge_subscription_id is not None:
        _validate_bridge_subscription(db, admin, payload.bridge_subscription_id)

    return sub


@router.get("/subscriptions", response_model=list[ExternalSubscriptionResponse])
def list_subscriptions(
    db: DBDep,
    admin: AdminDep,
    category: str | None = None,
):
    query_admin_id = None if admin.is_sudo else admin.id
    subs = crud.get_external_subscriptions(
        db, admin_id=query_admin_id, category=category
    )
    for sub in subs:
        sub.server_count = len(crud.get_proxy_pool_servers(db, subscription_id=sub.id))
    return subs


@router.get("/subscriptions/{sub_id}", response_model=ExternalSubscriptionResponse)
def get_subscription(
    sub_id: int,
    db: DBDep,
    admin: AdminDep,
):
    sub = crud.get_external_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)
    sub.server_count = len(crud.get_proxy_pool_servers(db, subscription_id=sub.id))
    return sub


@router.get("/subscriptions/{sub_id}/servers", response_model=list[ProxyPoolServerResponse])
def get_subscription_servers(
    sub_id: int,
    db: DBDep,
    admin: AdminDep,
):
    """Get all servers for a subscription."""
    sub = crud.get_external_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)
    
    servers = crud.get_proxy_pool_servers(db, subscription_id=sub_id)
    return servers


@router.put("/servers/{server_id}", response_model=ProxyPoolServerResponse)
def update_server(
    server_id: int,
    payload: ProxyPoolServerModify,
    db: DBDep,
    admin: AdminDep,
):
    server = crud.get_proxy_pool_server(db, server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    sub = crud.get_external_subscription(db, server.subscription_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)

    update_data = payload.model_dump(exclude_unset=True)
    server = crud.update_proxy_pool_server(db, server, **update_data)
    return server


@router.put("/subscriptions/{sub_id}", response_model=ExternalSubscriptionResponse)
def modify_subscription(
    sub_id: int,
    payload: ExternalSubscriptionModify,
    db: DBDep,
    admin: AdminDep,
):
    sub = crud.get_external_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)

    update_data = payload.model_dump(exclude_unset=True)

    # Validate routing_mode for bridge category
    category = update_data.get("category") or sub.category
    routing_mode = update_data.get("routing_mode") or sub.routing_mode
    selection_mode = (
        update_data.get("server_selection_mode")
        or sub.server_selection_mode
        or "all"
    )
    if category == "bridge":
        selection_mode = "all"
        update_data["server_selection_mode"] = "all"
        update_data["selected_server_ids"] = []
    elif selection_mode not in ("all", "manual", "selected"):
        selection_mode = "all"
        update_data["server_selection_mode"] = "all"

    if "selected_server_ids" in update_data:
        update_data["selected_server_ids"] = _normalize_selected_server_ids(
            update_data.get("selected_server_ids")
        )
    if selection_mode != "selected":
        update_data["selected_server_ids"] = []

    if category == "bridge" and routing_mode != "via_node":
        update_data["routing_mode"] = "via_node"

    sub = crud.update_external_subscription(db, sub, **update_data)

    # Auto-sync if URL or type changed
    if "url" in update_data or "type" in update_data:
        try:
            _sync_subscription_data(db, sub)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to sync subscription after update: {exc}",
            )

    # Validate preferred server if updated
    preferred_id = update_data.get("preferred_bridge_server_id")
    if preferred_id is not None:
        _validate_preferred_server(db, sub, preferred_id)

    # Validate bridge subscription if updated
    bridge_sub_id = update_data.get("bridge_subscription_id")
    if bridge_sub_id is not None:
        _validate_bridge_subscription(db, admin, bridge_sub_id)

    return sub


@router.delete("/subscriptions/{sub_id}")
def delete_subscription(
    sub_id: int,
    db: DBDep,
    admin: AdminDep,
):
    sub = crud.get_external_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)
    crud.remove_external_subscription(db, sub)
    return {}


@router.post("/subscriptions/{sub_id}/sync")
def sync_subscription(
    sub_id: int,
    db: DBDep,
    admin: AdminDep,
):
    sub = crud.get_external_subscription(db, sub_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    check_subscription_owner(sub, admin)

    _sync_subscription_data(db, sub)
    return {"status": "synced", "subscription_id": sub_id}


async def _test_server_latency(address: str, port: int, timeout: float = 5.0) -> int | None:
    """Test TCP connection latency in ms. Returns None on failure."""
    import socket
    try:
        loop = asyncio.get_event_loop()
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        start = asyncio.get_event_loop().time()
        await asyncio.wait_for(
            loop.run_in_executor(None, sock.connect, (address, port)),
            timeout=timeout,
        )
        elapsed = (asyncio.get_event_loop().time() - start) * 1000
        sock.close()
        return int(elapsed)
    except Exception:
        return None


@router.post("/pool/test")
async def test_pool_latency(
    db: DBDep,
    admin: AdminDep,
):
    """Run latency tests on all proxy pool servers."""
    query_admin_id = None if admin.is_sudo else admin.id
    subscriptions = crud.get_external_subscriptions(
        db, admin_id=query_admin_id
    )

    all_servers = []
    for sub in subscriptions:
        all_servers.extend(
            crud.get_proxy_pool_servers(db, subscription_id=sub.id)
        )

    results = []
    for srv in all_servers:
        if not srv.address or not srv.port:
            continue
        latency = await _test_server_latency(srv.address, srv.port)
        srv.latency_ms = latency
        srv.last_tested_at = __import__("datetime").datetime.utcnow()
        srv.is_available = latency is not None
        results.append({
            "server_id": srv.id,
            "name": srv.name,
            "latency_ms": latency,
            "is_available": srv.is_available,
        })

    db.commit()
    return {"tested": len(results), "results": results}


@router.get("/admin", response_class=HTMLResponse)
def proxy_pool_admin_page(
    db: DBDep,
    admin: AdminDep,
):
    query_admin_id = None if admin.is_sudo else admin.id
    subscriptions = crud.get_external_subscriptions(
        db, admin_id=query_admin_id
    )
    servers = []
    for sub in subscriptions:
        servers.extend(
            crud.get_proxy_pool_servers(db, subscription_id=sub.id)
        )
    return render_template(
        "proxy_pool_admin.html",
        {"subscriptions": subscriptions, "servers": servers},
    )
