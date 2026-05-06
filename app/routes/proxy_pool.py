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
)
from app.utils.vless_parser import parse_vless
from app.utils.subscription_parser import parse_subscription
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


@router.post("/subscriptions", response_model=ExternalSubscriptionResponse)
def add_subscription(
    payload: ExternalSubscriptionCreate,
    db: DBDep,
    admin: AdminDep,
):
    if payload.category == "bridge" and payload.routing_mode != "via_node":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bridge subscriptions must use routing_mode='via_node'",
        )

    db_admin = crud.get_admin(db, admin.username)
    sub = crud.create_external_subscription(
        db=db,
        admin_id=db_admin.id,
        name=payload.name,
        url=payload.url,
        type=payload.type,
        category=payload.category,
        routing_mode=payload.routing_mode,
        bridge_naming_template=payload.bridge_naming_template,
        preferred_bridge_server_id=payload.preferred_bridge_server_id,
        is_active=payload.is_active,
    )

    # If it's a single vless link, parse it immediately
    if payload.type == "vless" and payload.url.startswith("vless://"):
        try:
            parsed = parse_vless(payload.url)
            crud.create_proxy_pool_server(
                db=db,
                subscription_id=sub.id,
                **{k: v for k, v in parsed.items() if k != "name"},
                name=parsed.get("name") or payload.name,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid vless URL: {exc}",
            )

    return sub


@router.get("/subscriptions", response_model=list[ExternalSubscriptionResponse])
def list_subscriptions(
    db: DBDep,
    admin: AdminDep,
    category: str | None = None,
):
    query_admin_id = None if admin.is_sudo else admin.id
    return crud.get_external_subscriptions(
        db, admin_id=query_admin_id, category=category
    )


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
    if category == "bridge" and routing_mode != "via_node":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bridge subscriptions must use routing_mode='via_node'",
        )

    sub = crud.update_external_subscription(db, sub, **update_data)
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

    # Remove old servers
    crud.remove_proxy_pool_servers(db, sub_id)

    if sub.type in ("vless", "vmess", "trojan") and (
        sub.url.startswith("vless://")
        or sub.url.startswith("vmess://")
        or sub.url.startswith("trojan://")
    ):
        # Single proxy link
        try:
            parsed = parse_vless(sub.url)
            crud.create_proxy_pool_server(
                db=db,
                subscription_id=sub.id,
                **{k: v for k, v in parsed.items() if k != "name"},
                name=parsed.get("name") or sub.name,
            )
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid proxy URL: {exc}",
            )
    elif sub.type == "subscription":
        # Fetch and parse subscription URL
        import requests
        try:
            resp = requests.get(sub.url, timeout=15)
            resp.raise_for_status()
            servers = parse_subscription(resp.text)
            for srv in servers:
                crud.create_proxy_pool_server(
                    db=db,
                    subscription_id=sub.id,
                    **{k: v for k, v in srv.items() if k != "name"},
                    name=srv.get("name") or sub.name,
                )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to sync subscription: {exc}",
            )

    from datetime import datetime
    sub.last_sync_at = datetime.utcnow()
    db.commit()
    db.refresh(sub)
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
