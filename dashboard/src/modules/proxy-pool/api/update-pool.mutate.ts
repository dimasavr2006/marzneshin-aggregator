import { Pool, PoolMutationType, invalidatePoolsQueries } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

type PoolUpdatePayload = PoolMutationType;

const normalizePoolPayload = (pool: PoolUpdatePayload): PoolUpdatePayload => ({
    id: pool.id,
    name: pool.name,
    url: pool.url,
    type: pool.type,
    category: pool.category,
    routing_mode: pool.category === "bridge" ? "via_node" : pool.routing_mode,
    bridge_naming_template: pool.bridge_naming_template ?? null,
    preferred_bridge_server_id: pool.preferred_bridge_server_id ?? null,
    bridge_subscription_id: pool.bridge_subscription_id ?? null,
    server_selection_mode: pool.server_selection_mode ?? "all",
    selected_server_ids: pool.selected_server_ids ?? [],
    is_active: pool.is_active,
});

export async function fetchUpdatePool(pool: PoolUpdatePayload): Promise<Pool> {
    const payload = normalizePoolPayload(pool);
    if (!payload.id) {
        throw new Error("Pool id is required for update");
    }
    return fetch(`/proxy-pool/subscriptions/${payload.id}`, { method: "put", body: payload });
}

export const usePoolsUpdateMutation = () => {
    return useMutation({
        mutationFn: fetchUpdatePool,
        onError: (error: any, value: PoolUpdatePayload) => {
            const detail = error?.response?.detail || error?.message;
            toast.error(detail || i18n.t('events.update.error', { name: value.name || "subscription" }));
        },
        onSuccess: (value: Pool) => {
            toast.success(i18n.t('events.update.success.title', { name: value.name }));
            invalidatePoolsQueries();
        },
    });
};
