import { Pool, PoolMutationType, invalidatePoolsQueries } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchCreatePool(pool: PoolMutationType): Promise<Pool> {
    return fetch('/proxy-pool/subscriptions', { method: 'post', body: pool });
}

export const usePoolsCreationMutation = () => {
    return useMutation({
        mutationFn: fetchCreatePool,
        onError: (_error: Error, value: PoolMutationType) => {
            toast.error(i18n.t('events.create.error', { name: value.name || "subscription" }));
        },
        onSuccess: (value: Pool) => {
            toast.success(i18n.t('events.create.success.title', { name: value.name }));
            invalidatePoolsQueries();
        },
    });
};
