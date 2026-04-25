import base64
import urllib.parse
from typing import Any

import yaml

from app.utils.vless_parser import parse_vless


def parse_subscription(content: str) -> list[dict[str, Any]]:
    """Parse a subscription content (base64, YAML, or plain text links)."""
    content = content.strip()
    if not content:
        return []

    # Try base64 first
    try:
        decoded = base64.b64decode(content).decode("utf-8")
        return _parse_links(decoded)
    except Exception:
        pass

    # Try YAML (Clash)
    try:
        data = yaml.safe_load(content)
        if isinstance(data, dict) and "proxies" in data:
            return _parse_clash_proxies(data["proxies"])
    except Exception:
        pass

    # Fallback to plain text links
    return _parse_links(content)


def _parse_links(text: str) -> list[dict[str, Any]]:
    """Parse plain text containing one proxy URL per line."""
    servers = []
    for line in text.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("vless://"):
            try:
                servers.append(parse_vless(line))
            except ValueError:
                continue
        elif line.startswith("vmess://"):
            try:
                servers.append(_parse_vmess(line))
            except ValueError:
                continue
        elif line.startswith("trojan://"):
            try:
                servers.append(_parse_trojan(line))
            except ValueError:
                continue
    return servers


def _parse_vmess(url: str) -> dict[str, Any]:
    """Parse a vmess:// URL (base64 JSON)."""
    if not url.startswith("vmess://"):
        raise ValueError("URL must start with vmess://")

    b64 = url[len("vmess://"):]
    try:
        decoded = base64.b64decode(b64 + "=" * (-len(b64) % 4)).decode("utf-8")
        data = __import__("json").loads(decoded)
    except Exception as exc:
        raise ValueError(f"Invalid vmess URL: {exc}")

    return {
        "protocol": "vmess",
        "name": data.get("ps"),
        "address": data.get("add"),
        "port": int(data.get("port", 0)) if data.get("port") else None,
        "uuid": data.get("id"),
        "security": data.get("scy", "auto"),
        "network": data.get("net", "tcp"),
        "tls": data.get("tls"),
        "sni": data.get("sni") or data.get("host"),
        "host": data.get("host"),
        "path": data.get("path"),
        "fp": data.get("fp"),
    }


def _parse_trojan(url: str) -> dict[str, Any]:
    """Parse a trojan:// URL."""
    if not url.startswith("trojan://"):
        raise ValueError("URL must start with trojan://")

    rest = url[len("trojan://"):]
    if "@" not in rest:
        raise ValueError("Invalid trojan URL: missing @")

    password, server_part = rest.split("@", 1)

    if "?" in server_part:
        server_query, fragment = server_part.split("?", 1)
        if "#" in fragment:
            query_string, name = fragment.split("#", 1)
        else:
            query_string = fragment
            name = None
    else:
        if "#" in server_part:
            server_query, name = server_part.split("#", 1)
        else:
            server_query = server_part
            name = None
        query_string = ""

    if ":" not in server_query:
        raise ValueError("Invalid trojan URL: missing port")

    address, port_str = server_query.rsplit(":", 1)
    port = int(port_str)

    params = urllib.parse.parse_qs(query_string)
    params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}

    return {
        "protocol": "trojan",
        "name": urllib.parse.unquote(name) if name else None,
        "address": address,
        "port": port,
        "password": password,
        "security": params.get("security"),
        "network": params.get("type", "tcp"),
        "tls": params.get("security"),
        "sni": params.get("sni"),
        "host": params.get("host"),
        "path": params.get("path"),
        "fp": params.get("fp"),
    }


def _parse_clash_proxies(proxies: list[dict]) -> list[dict[str, Any]]:
    """Convert Clash proxies to our proxy pool format."""
    servers = []
    for p in proxies:
        proxy_type = p.get("type", "").lower()
        if proxy_type == "vless":
            servers.append({
                "protocol": "vless",
                "name": p.get("name"),
                "address": p.get("server"),
                "port": p.get("port"),
                "uuid": p.get("uuid"),
                "password": None,
                "security": p.get("cipher"),
                "network": p.get("network", "tcp"),
                "tls": "tls" if p.get("tls") else ("reality" if p.get("reality-opts") else None),
                "sni": p.get("sni") or p.get("servername"),
                "host": p.get("ws-opts", {}).get("headers", {}).get("Host")
                        or p.get("http-opts", {}).get("headers", {}).get("Host")
                        or p.get("h2-opts", {}).get("host", [None])[0],
                "path": p.get("ws-opts", {}).get("path")
                        or p.get("http-opts", {}).get("path", ["/"])[0]
                        or p.get("h2-opts", {}).get("path"),
                "fp": p.get("client-fingerprint"),
                "pbk": p.get("reality-opts", {}).get("public-key"),
                "sid": p.get("reality-opts", {}).get("short-id"),
                "flow": p.get("flow"),
            })
        elif proxy_type == "vmess":
            servers.append({
                "protocol": "vmess",
                "name": p.get("name"),
                "address": p.get("server"),
                "port": p.get("port"),
                "uuid": p.get("uuid"),
                "password": None,
                "security": p.get("cipher", "auto"),
                "network": p.get("network", "tcp"),
                "tls": "tls" if p.get("tls") else None,
                "sni": p.get("sni") or p.get("servername"),
                "host": p.get("ws-opts", {}).get("headers", {}).get("Host")
                        or p.get("http-opts", {}).get("headers", {}).get("Host"),
                "path": p.get("ws-opts", {}).get("path")
                        or p.get("http-opts", {}).get("path", ["/"])[0],
                "fp": p.get("client-fingerprint"),
            })
        elif proxy_type == "trojan":
            servers.append({
                "protocol": "trojan",
                "name": p.get("name"),
                "address": p.get("server"),
                "port": p.get("port"),
                "password": p.get("password"),
                "security": None,
                "network": p.get("network", "tcp"),
                "tls": "tls" if p.get("tls") else None,
                "sni": p.get("sni") or p.get("servername"),
                "host": p.get("ws-opts", {}).get("headers", {}).get("Host")
                        or p.get("http-opts", {}).get("headers", {}).get("Host"),
                "path": p.get("ws-opts", {}).get("path")
                        or p.get("http-opts", {}).get("path", ["/"])[0],
                "fp": p.get("client-fingerprint"),
            })
    return servers
