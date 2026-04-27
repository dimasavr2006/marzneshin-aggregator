import { Pool, PoolsQueryFetchKey } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch, queryClient } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchCreatePool(pool: Pool): Promise<Pool> {
    return fetch('/proxy-pool/subscriptions', { method: 'post', body: pool });
}

export const usePoolsCreationMutation = () => {
    return useMutation({
        mutationFn: fetchCreatePool,
        onError: (_error: Error, value: Pool) => {
            toast.error(i18n.t('events.create.error', { name: value.name }));
        },
        onSuccess: (value: Pool) => {
            toast.success(i18n.t('events.create.success.title', { name: value.name }));
            queryClient.invalidateQueries({ queryKey: [PoolsQueryFetchKey] });
        },
    });
};
