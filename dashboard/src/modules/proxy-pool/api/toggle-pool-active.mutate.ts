import { Pool, invalidatePoolsQueries } from "@marzneshin/modules/proxy-pool";
import { fetch } from "@marzneshin/common/utils";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

type TogglePoolActivePayload = {
    id: number;
    is_active: boolean;
};

export async function fetchTogglePoolActive(
    payload: TogglePoolActivePayload,
): Promise<Pool> {
    return fetch(`/proxy-pool/subscriptions/${payload.id}`, {
        method: "put",
        body: { is_active: payload.is_active },
    });
}

export const usePoolsToggleActiveMutation = () => {
    return useMutation({
        mutationFn: fetchTogglePoolActive,
        onError: (error: any) => {
            const detail = error?.response?.detail || error?.message;
            toast.error(detail || "Failed to update subscription status");
        },
        onSuccess: () => {
            invalidatePoolsQueries();
        },
    });
};

