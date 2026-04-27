import { Pool, PoolsQueryFetchKey } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch, queryClient } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchUpdatePool(pool: Pool): Promise<Pool> {
    return fetch(`/proxy-pool/subscriptions/${pool.id}`, { method: 'put', body: pool });
}

export const usePoolsUpdateMutation = () => {
    return useMutation({
        mutationFn: fetchUpdatePool,
        onError: (_error: Error, value: Pool) => {
            toast.error(i18n.t('events.update.error', { name: value.name }));
        },
        onSuccess: (value: Pool) => {
            toast.success(i18n.t('events.update.success.title', { name: value.name }));
            queryClient.invalidateQueries({ queryKey: [PoolsQueryFetchKey] });
        },
    });
};
