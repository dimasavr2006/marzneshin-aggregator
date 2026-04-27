import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RouterPoolContext } from '@marzneshin/modules/proxy-pool'

export const Route = createFileRoute('/_dashboard/proxy-pools/$poolId')({
    loader: async ({ params }) => {
        const { fetch } = await import('@marzneshin/common/utils')
        const pool = await fetch(`/proxy-pool/subscriptions/${params.poolId}`)
        return { pool }
    },
    component: () => {
        const { pool } = Route.useLoaderData()
        return (
            <RouterPoolContext.Provider value={{ pool }}>
                <Outlet />
            </RouterPoolContext.Provider>
        )
    },
})
