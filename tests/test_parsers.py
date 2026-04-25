import base64

import pytest

from app.utils.subscription_parser import parse_subscription
from app.utils.vless_parser import parse_vless


class TestVlessParser:
    def test_parse_vless_basic(self):
        url = "vless://550e8400-e29b-41d4-a716-446655440000@example.com:443?security=reality&sni=example.com#MyServer"
        result = parse_vless(url)
        assert result["protocol"] == "vless"
        assert result["uuid"] == "550e8400-e29b-41d4-a716-446655440000"
        assert result["address"] == "example.com"
        assert result["port"] == 443
        assert result["security"] == "reality"
        assert result["tls"] == "reality"
        assert result["sni"] == "example.com"
        assert result["name"] == "MyServer"

    def test_parse_vless_no_name(self):
        url = "vless://550e8400-e29b-41d4-a716-446655440000@example.com:443?security=tls"
        result = parse_vless(url)
        assert result["name"] is None
        assert result["network"] == "tcp"

    def test_parse_vless_with_all_params(self):
        url = (
            "vless://uuid@host:8443?"
            "security=reality&type=xhttp&path=/path&host=cdn.example.com"
            "&fp=chrome&pbk=public_key&sid=short_id&flow=xtls-rprx-vision&sni=sni.example.com"
            "#Advanced"
        )
        result = parse_vless(url)
        assert result["port"] == 8443
        assert result["network"] == "xhttp"
        assert result["path"] == "/path"
        assert result["host"] == "cdn.example.com"
        assert result["fp"] == "chrome"
        assert result["pbk"] == "public_key"
        assert result["sid"] == "short_id"
        assert result["flow"] == "xtls-rprx-vision"
        assert result["sni"] == "sni.example.com"

    def test_parse_vless_invalid_url(self):
        with pytest.raises(ValueError, match="must start with vless://"):
            parse_vless("https://example.com")

    def test_parse_vless_missing_at(self):
        with pytest.raises(ValueError, match="missing @"):
            parse_vless("vless://uuidhost:443")

    def test_parse_vless_missing_port(self):
        with pytest.raises(ValueError, match="missing port"):
            parse_vless("vless://uuid@host")


class TestSubscriptionParser:
    def test_parse_base64_vless(self):
        links = [
            "vless://uuid1@host1:443?security=reality&sni=host1#Server1",
            "vless://uuid2@host2:8443?security=tls&type=xhttp#Server2",
        ]
        content = base64.b64encode("\n".join(links).encode()).decode()
        servers = parse_subscription(content)
        assert len(servers) == 2
        assert servers[0]["name"] == "Server1"
        assert servers[1]["name"] == "Server2"

    def test_parse_plain_text(self):
        content = "vless://uuid@host:443?security=reality#Test\n\nvmess://eyJhZGQiOiJob3N0In0="
        servers = parse_subscription(content)
        assert len(servers) >= 1
        assert servers[0]["name"] == "Test"

    def test_parse_clash_yaml(self):
        yaml_content = """
proxies:
  - name: VLESS_Proxy
    type: vless
    server: vless.host
    port: 443
    uuid: test-uuid
    tls: true
    servername: vless.host
  - name: Trojan_Proxy
    type: trojan
    server: trojan.host
    port: 443
    password: secret123
"""
        servers = parse_subscription(yaml_content)
        assert len(servers) == 2
        assert servers[0]["protocol"] == "vless"
        assert servers[0]["address"] == "vless.host"
        assert servers[1]["protocol"] == "trojan"
        assert servers[1]["address"] == "trojan.host"

    def test_parse_empty_content(self):
        assert parse_subscription("") == []
        assert parse_subscription("   ") == []

    def test_parse_invalid_content(self):
        # Should not crash, just return empty or partial results
        result = parse_subscription("not a valid subscription")
        assert isinstance(result, list)
