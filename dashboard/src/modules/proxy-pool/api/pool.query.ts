import type { Pool } from "@marzneshin/modules/proxy-pool";
import { fetch } from "@marzneshin/common/utils";

export async function fetchPool({ queryKey }: { queryKey: [string, number] }): Promise<Pool> {
    return fetch(`/proxy-pool/subscriptions/${queryKey[1]}`);
}
