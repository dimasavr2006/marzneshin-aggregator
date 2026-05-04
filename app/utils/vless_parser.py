import urllib.parse
from typing import Any


def decode_json_escapes(text: str) -> str:
    """Decode common JSON unicode escapes that sometimes appear in URLs."""
    return (
        text.replace("\\u0026", "&")
        .replace("\\u003D", "=")
        .replace("\\u003F", "?")
        .replace("\\u0023", "#")
        .replace("\\u002F", "/")
        .replace("\\u003A", ":")
        .replace("\\u002B", "+")
    )


def parse_vless(url: str) -> dict[str, Any]:
    """Parse a vless:// URL and return a dict of proxy parameters."""
    url = decode_json_escapes(url)
    if not url.startswith("vless://"):
        raise ValueError("URL must start with vless://")

    # Remove protocol prefix
    rest = url[len("vless://"):]

    # Split auth and remaining URL
    if "@" not in rest:
        raise ValueError("Invalid vless URL: missing @")

    auth_part, server_part = rest.split("@", 1)
    uuid = auth_part

    # Split server and query/fragment
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

    # Parse address and port
    if ":" not in server_query:
        raise ValueError("Invalid vless URL: missing port")

    address, port_str = server_query.rsplit(":", 1)
    port = int(port_str)

    # Parse query parameters
    params = urllib.parse.parse_qs(query_string)
    # Convert single-item lists to scalars
    params = {k: v[0] if len(v) == 1 else v for k, v in params.items()}

    result = {
        "protocol": "vless",
        "name": urllib.parse.unquote(name) if name else None,
        "address": address,
        "port": port,
        "uuid": uuid,
        "security": params.get("security"),
        "network": params.get("type", "tcp"),
        "tls": params.get("security"),
        "sni": params.get("sni"),
        "host": params.get("host"),
        "path": params.get("path"),
        "fp": params.get("fp"),
        "pbk": params.get("pbk"),
        "sid": params.get("sid"),
        "flow": params.get("flow"),
    }

    return result
