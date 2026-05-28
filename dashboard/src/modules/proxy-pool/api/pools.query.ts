import type { Pool } from "@marzneshin/modules/proxy-pool";
import { useQuery } from "@tanstack/react-query";
import { fetch, queryClient } from "@marzneshin/common/utils";
import type {
    EntityQueryKeyType,
    UseEntityQueryProps,
    FetchEntityReturn
} from "@marzneshin/libs/entity-table";

export async function fetchPools({
    queryKey,
}: EntityQueryKeyType): FetchEntityReturn<Pool> {
    const pagination = queryKey[1];
    const primaryFilter = queryKey[2];
    const filters = queryKey[4].filters;
    const entityKey = queryKey[0] as string;
    const category = entityKey.startsWith("proxy-pools-") ? entityKey.replace("proxy-pools-", "") : undefined;
    return fetch('/proxy-pool/subscriptions', {
        query: {
            ...pagination,
            ...filters,
            name: primaryFilter,
            descending: queryKey[3].desc,
            order_by: queryKey[3].sortBy,
            ...(category ? { category } : {}),
        }
    }).then((result) => {
        return {
            entities: result,
            pageCount: 1,
        };
    });
}

export const PoolsQueryFetchKey = "proxy-pools";

const isProxyPoolQueryKey = (value: unknown): value is string =>
    typeof value === "string" && value.startsWith(PoolsQueryFetchKey);

export const invalidatePoolsQueries = () =>
    queryClient.invalidateQueries({
        predicate: (query) => isProxyPoolQueryKey(query.queryKey[0]),
    });

export const usePoolsQuery = ({
    page, size, sortBy = "created_at", desc = false, filters = {}
}: UseEntityQueryProps) => {
    return useQuery({
        queryKey: [PoolsQueryFetchKey, { page, size }, filters?.name ?? "", { sortBy, desc }, { filters }],
        queryFn: fetchPools,
        initialData: { entities: [], pageCount: 0 },
    });
};
