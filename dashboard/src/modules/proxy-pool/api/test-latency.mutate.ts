import { useMutation } from "@tanstack/react-query";
import { fetch } from "@marzneshin/common/utils";
import { toast } from "sonner";
import i18n from "@marzneshin/features/i18n";

export async function fetchTestLatency(): Promise<{ tested: number; results: Array<{ server_id: number; name: string; latency_ms: number | null; is_available: boolean }> }> {
    return fetch('/proxy-pool/pool/test', { method: 'post' });
}

export const useLatencyTestMutation = () => {
    return useMutation({
        mutationFn: fetchTestLatency,
        onError: (_error: Error) => {
            toast.error(i18n.t('page.proxy-pools.test.error'));
        },
        onSuccess: (data) => {
            toast.success(i18n.t('page.proxy-pools.test.success', { count: data.tested }));
        },
    });
};
