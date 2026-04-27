import { PoolsQueryFetchKey } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch, queryClient } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchDeletePool(id: number): Promise<void> {
    return fetch(`/proxy-pool/subscriptions/${id}`, { method: 'delete' });
}

export const usePoolsDeletionMutation = () => {
    return useMutation({
        mutationFn: fetchDeletePool,
        onError: (_error: Error, _id: number) => {
            toast.error(i18n.t('events.delete.error'));
        },
        onSuccess: () => {
            toast.success(i18n.t('events.delete.success'));
            queryClient.invalidateQueries({ queryKey: [PoolsQueryFetchKey] });
        },
    });
};
