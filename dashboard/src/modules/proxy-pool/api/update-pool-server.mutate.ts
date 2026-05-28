import { invalidatePoolsQueries } from "@marzneshin/modules/proxy-pool";
import { useMutation } from "@tanstack/react-query";
import { fetch } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchUpdatePoolServer(serverId: number, data: { name?: string | null; bridge_naming_override?: string | null }) {
    return fetch(`/proxy-pool/servers/${serverId}`, { method: 'put', body: data });
}

export const usePoolServerUpdateMutation = () => {
    return useMutation({
        mutationFn: ({ serverId, data }: { serverId: number; data: { name?: string | null; bridge_naming_override?: string | null } }) =>
            fetchUpdatePoolServer(serverId, data),
        onError: () => {
            toast.error(i18n.t('events.update.error', { name: 'Server' }));
        },
        onSuccess: () => {
            toast.success(i18n.t('events.update.success.title', { name: 'Server' }));
            invalidatePoolsQueries();
        },
    });
};
