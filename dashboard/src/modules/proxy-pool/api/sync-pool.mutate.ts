import { PoolsQueryFetchKey } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch, queryClient } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchSyncPool(subId: number): Promise<{ status: string; subscription_id: number }> {
    return fetch(`/proxy-pool/subscriptions/${subId}/sync`, { method: 'post' });
}

export const usePoolsSyncMutation = () => {
    return useMutation({
        mutationFn: fetchSyncPool,
        onError: (_error: Error) => {
            toast.error(i18n.t('page.proxy-pools.sync.error'));
        },
        onSuccess: () => {
            toast.success(i18n.t('page.proxy-pools.sync.success'));
            queryClient.invalidateQueries({ queryKey: [PoolsQueryFetchKey] });
        },
    });
};
