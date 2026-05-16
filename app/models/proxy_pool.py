from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class ExternalSubscriptionCreate(BaseModel):
    name: str
    url: str
    type: Literal["vless", "vmess", "trojan", "subscription"]
    category: Literal["bridge", "external"]
    routing_mode: Literal["direct", "via_node", "both"] = "both"
    bridge_naming_template: str | None = None
    preferred_bridge_server_id: int | None = None
    bridge_subscription_id: int | None = None
    is_active: bool = True


class ExternalSubscriptionModify(BaseModel):
    name: str | None = None
    url: str | None = None
    type: Literal["vless", "vmess", "trojan", "subscription"] | None = None
    category: Literal["bridge", "external"] | None = None
    routing_mode: Literal["direct", "via_node", "both"] | None = None
    bridge_naming_template: str | None = None
    preferred_bridge_server_id: int | None = None
    bridge_subscription_id: int | None = None
    is_active: bool | None = None


class ExternalSubscriptionResponse(BaseModel):
    id: int
    name: str
    url: str
    type: str
    category: str
    routing_mode: str
    bridge_naming_template: str | None
    preferred_bridge_server_id: int | None
    bridge_subscription_id: int | None
    admin_id: int | None
    is_active: bool
    server_count: int = 0
    last_sync_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProxyPoolServerResponse(BaseModel):
    id: int
    subscription_id: int
    protocol: str | None
    name: str | None
    address: str | None
    port: int | None
    uuid: str | None
    security: str | None
    network: str | None
    latency_ms: int | None
    last_tested_at: datetime | None
    is_available: bool
    bridge_naming_override: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProxyPoolServerModify(BaseModel):
    name: str | None = None
    bridge_naming_override: str | None = None
