import type { PoolServer } from "@marzneshin/modules/proxy-pool";
import { fetch } from "@marzneshin/common/utils";

export async function fetchPoolServers(subscriptionId: number): Promise<PoolServer[]> {
    return fetch(`/proxy-pool/subscriptions/${subscriptionId}/servers`);
}
