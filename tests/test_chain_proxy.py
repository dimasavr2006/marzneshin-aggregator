import copy
import json
import urllib.parse
from unittest.mock import MagicMock, patch

import pytest
from v2share import V2Data, XrayConfig, SingBoxConfig
from v2share.links import LinksConfig

from app.utils.share import (
    proxy_pool_server_to_v2data,
    get_proxy_pool_configs,
)


class TestProxyPoolServerToV2Data:
    def test_basic_conversion(self):
        class MockServer:
            protocol = "vless"
            name = "Test Server"
            address = "example.com"
            port = 443
            uuid = "550e8400-e29b-41d4-a716-446655440000"
            password = None
            network = "tcp"
            tls = "reality"
            sni = "example.com"
            host = None
            path = None
            fp = "chrome"
            pbk = "pubkey"
            sid = "sid123"
            flow = "xtls-rprx-vision"

        srv = MockServer()
        data = proxy_pool_server_to_v2data(srv)
        assert data is not None
        assert data.protocol == "vless"
        assert data.remark == "Test Server"
        assert data.address == "example.com"
        assert data.port == 443
        assert str(data.uuid) == "550e8400-e29b-41d4-a716-446655440000"
        assert data.tls == "reality"
        assert data.sni == "example.com"
        assert data.fingerprint == "chrome"
        assert data.reality_pbk == "pubkey"
        assert data.reality_sid == "sid123"
        assert data.flow == "xtls-rprx-vision"

    def test_missing_address(self):
        class MockServer:
            address = None
            port = 443

        assert proxy_pool_server_to_v2data(MockServer()) is None

    def test_with_subscription_name(self):
        class MockServer:
            protocol = "vless"
            name = None
            address = "host.com"
            port = 443
            uuid = None
            password = None
            network = None
            tls = None
            sni = None
            host = None
            path = None
            fp = None
            pbk = None
            sid = None
            flow = None

        class MockSub:
            name = "Bridge Sub"

        data = proxy_pool_server_to_v2data(MockServer(), MockSub())
        assert data.remark == "🌉 Bridge Sub"


class TestChainProxy:
    def test_xray_chain_proxy(self):
        """Test that Xray config properly uses proxySettings via dialerProxy"""
        user = V2Data(
            "vless", "Direct Server", "user.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440000",
            tls="reality", sni="user.host", reality_pbk="pubkey", reality_sid="sid123"
        )
        bridge = V2Data(
            "vless", "Bridge Server", "bridge.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440001",
            tls="reality", sni="bridge.host", reality_pbk="bpk", reality_sid="bsid"
        )

        wrapped = copy.deepcopy(user)
        wrapped.remark = "Bridge -> Direct"
        wrapped.next = bridge

        xc = XrayConfig()
        xc.add_proxies([wrapped])
        configs = json.loads(xc.render())

        assert len(configs) == 1
        outbounds = configs[0]["outbounds"]
        assert len(outbounds) == 2

        # First outbound is the user config with dialerProxy
        user_outbound = outbounds[0]
        assert user_outbound["tag"] == "Bridge -> Direct"
        assert user_outbound["protocol"] == "vless"
        assert "streamSettings" in user_outbound
        assert "sockopt" in user_outbound["streamSettings"]
        assert user_outbound["streamSettings"]["sockopt"]["dialerProxy"] == "Bridge Server"

        # Second outbound is the bridge
        bridge_outbound = outbounds[1]
        assert bridge_outbound["tag"] == "Bridge Server"
        assert bridge_outbound["protocol"] == "vless"

    def test_singbox_chain_proxy(self):
        """Test that Sing-box config properly uses detour"""
        user = V2Data(
            "vless", "Direct Server", "user.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440000",
            tls="reality", sni="user.host", reality_pbk="pubkey", reality_sid="sid123"
        )
        bridge = V2Data(
            "vless", "Bridge Server", "bridge.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440001",
            tls="reality", sni="bridge.host", reality_pbk="bpk", reality_sid="bsid"
        )

        wrapped = copy.deepcopy(user)
        wrapped.remark = "Bridge -> Direct"
        wrapped.next = bridge

        sc = SingBoxConfig()
        sc.add_proxies([wrapped])
        config = json.loads(sc.render())

        outbounds = config["outbounds"]
        user_out = next(o for o in outbounds if o["tag"] == "Bridge -> Direct")
        bridge_out = next(o for o in outbounds if o["tag"] == "Bridge Server")

        assert user_out["detour"] == "Bridge Server"
        assert bridge_out["type"] == "vless"
        assert "detour" not in bridge_out

    def test_chain_with_multiple_bridges(self):
        """Test wrapping with multiple bridge servers"""
        user = V2Data("vless", "User", "u.host", 443, uuid="u-u-i-d")
        bridge1 = V2Data("vless", "B1", "b1.host", 443, uuid="b1-uuid")
        bridge2 = V2Data("vless", "B2", "b2.host", 443, uuid="b2-uuid")

        wrapped1 = copy.deepcopy(user)
        wrapped1.remark = "Via B1"
        wrapped1.next = bridge1

        wrapped2 = copy.deepcopy(user)
        wrapped2.remark = "Via B2"
        wrapped2.next = bridge2

        xc = XrayConfig()
        xc.add_proxies([wrapped1, wrapped2])
        configs = json.loads(xc.render())

        assert len(configs) == 2
        tags = [c["outbounds"][0]["tag"] for c in configs]
        assert "Via B1" in tags
        assert "Via B2" in tags


class TestGetProxyPoolConfigs:
    """Test get_proxy_pool_configs filtering by chaining_support."""

    @pytest.fixture
    def mock_bridge_sub(self):
        sub = MagicMock()
        sub.id = 1
        sub.name = "TestBridge"
        sub.category = "bridge"
        sub.routing_mode = "both"
        sub.is_active = True
        return sub

    @pytest.fixture
    def mock_bridge_server(self):
        srv = MagicMock()
        srv.protocol = "vless"
        srv.name = None
        srv.address = "bridge.example.com"
        srv.port = 443
        srv.uuid = "550e8400-e29b-41d4-a716-446655440001"
        srv.password = None
        srv.network = "tcp"
        srv.tls = "reality"
        srv.sni = "bridge.example.com"
        srv.host = None
        srv.path = None
        srv.fp = "chrome"
        srv.pbk = "bpk"
        srv.sid = "bsid"
        srv.flow = "xtls-rprx-vision"
        return srv

    @pytest.fixture
    def user_configs(self):
        return [
            V2Data("vless", "TCP Node", "node1.com", 443,
                   uuid="550e8400-e29b-41d4-a716-446655440000",
                   tls="reality", sni="node1.com", reality_pbk="pk", reality_sid="sid"),
            V2Data("vless", "XHTTP Node", "node1.com", 8443,
                   uuid="550e8400-e29b-41d4-a716-446655440000",
                   transport_type="splithttp",
                   tls="reality", sni="node1.com", reality_pbk="pk", reality_sid="sid"),
        ]

    def test_chaining_support_true_returns_wrapped_only(
        self, mock_bridge_sub, mock_bridge_server, user_configs
    ):
        """When chaining_support=True, only wrapped configs should be returned."""
        with patch("app.utils.share.GetDB") as mock_db_ctx, \
             patch("app.utils.share.get_external_subscriptions") as mock_get_subs, \
             patch("app.utils.share.get_proxy_pool_servers") as mock_get_servers:

            mock_db = MagicMock()
            mock_db_ctx.return_value.__enter__.return_value = mock_db

            def side_effect(db, admin_id, category):
                if category == "bridge":
                    return [mock_bridge_sub]
                return []

            mock_get_subs.side_effect = side_effect
            mock_get_servers.return_value = [mock_bridge_server]

            result = get_proxy_pool_configs(
                user_admin_id=1,
                user_configs=user_configs,
                chaining_support=True,
            )

            # Should have wrapped configs (2 user configs × 1 bridge)
            assert len(result) == 2
            remarks = [r.remark for r in result]
            assert "🌉 [TestBridge] TCP Node" in remarks
            assert "🌉 [TestBridge] XHTTP Node" in remarks

            # All should have next (chain proxy)
            assert all(r.next is not None for r in result)

    def test_chaining_support_false_returns_standalone_only(
        self, mock_bridge_sub, mock_bridge_server, user_configs
    ):
        """When chaining_support=False, only standalone bridge configs should be returned."""
        with patch("app.utils.share.GetDB") as mock_db_ctx, \
             patch("app.utils.share.get_external_subscriptions") as mock_get_subs, \
             patch("app.utils.share.get_proxy_pool_servers") as mock_get_servers:

            mock_db = MagicMock()
            mock_db_ctx.return_value.__enter__.return_value = mock_db

            def side_effect(db, admin_id, category):
                if category == "bridge":
                    return [mock_bridge_sub]
                return []

            mock_get_subs.side_effect = side_effect
            mock_get_servers.return_value = [mock_bridge_server]

            result = get_proxy_pool_configs(
                user_admin_id=1,
                user_configs=user_configs,
                chaining_support=False,
            )

            # Should have standalone bridge config only
            assert len(result) == 1
            assert result[0].remark == "🌉 TestBridge"
            assert result[0].next is None

    def test_chaining_support_true_no_user_configs(self, mock_bridge_sub, mock_bridge_server):
        """When chaining_support=True but no user_configs, return empty."""
        with patch("app.utils.share.GetDB") as mock_db_ctx, \
             patch("app.utils.share.get_external_subscriptions") as mock_get_subs, \
             patch("app.utils.share.get_proxy_pool_servers") as mock_get_servers:

            mock_db = MagicMock()
            mock_db_ctx.return_value.__enter__.return_value = mock_db

            def side_effect(db, admin_id, category):
                if category == "bridge":
                    return [mock_bridge_sub]
                return []

            mock_get_subs.side_effect = side_effect
            mock_get_servers.return_value = [mock_bridge_server]

            result = get_proxy_pool_configs(
                user_admin_id=1,
                user_configs=None,
                chaining_support=True,
            )

            assert len(result) == 0

    def test_singbox_render_with_wrapped_configs(self, user_configs):
        """Sing-box config should properly render wrapped configs with detour."""
        bridge = V2Data(
            "vless", "Bridge Server", "bridge.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440001",
            tls="reality", sni="bridge.host", reality_pbk="bpk", reality_sid="bsid"
        )

        wrapped = copy.deepcopy(user_configs[0])
        wrapped.remark = "🌉 [TestBridge] TCP Node"
        wrapped.next = bridge

        sc = SingBoxConfig()
        sc.add_proxies([wrapped])
        config = json.loads(sc.render())

        outbounds = config["outbounds"]
        user_out = next(o for o in outbounds if o["tag"] == "🌉 [TestBridge] TCP Node")
        bridge_out = next(o for o in outbounds if o["tag"] == "Bridge Server")

        assert user_out["detour"] == "Bridge Server"
        assert bridge_out["type"] == "vless"
        assert "detour" not in bridge_out

    def test_links_no_wrapped_configs(self, user_configs):
        """Links format should not contain wrapped configs (next is ignored)."""
        bridge = V2Data(
            "vless", "Bridge Server", "bridge.host", 443,
            uuid="550e8400-e29b-41d4-a716-446655440001",
            tls="reality", sni="bridge.host", reality_pbk="bpk", reality_sid="bsid"
        )

        wrapped = copy.deepcopy(user_configs[0])
        wrapped.remark = "🌉 [TestBridge] TCP Node"
        wrapped.next = bridge

        lc = LinksConfig()
        lc.add_proxies([wrapped])
        links = lc.render().split("\n")

        # Should only contain one link (wrapped config rendered as regular link)
        assert len(links) == 1
        decoded = urllib.parse.unquote(links[0])
        assert "🌉 [TestBridge] TCP Node" in decoded
        # The link does not contain chain proxy info
        assert "bridge.host" not in links[0]
