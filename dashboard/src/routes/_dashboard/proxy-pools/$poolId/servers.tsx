import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { ServersDialog, useRouterPoolContext } from '@marzneshin/modules/proxy-pool'

export const Route = createFileRoute('/_dashboard/proxy-pools/$poolId/servers')({
  component: () => {
    const ctx = useRouterPoolContext()
    const navigate = useNavigate({ from: '/proxy-pools/$poolId/servers' })
    
    if (!ctx) return null
    
    return (
      <ServersDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate({ to: '/proxy-pools' })
        }}
        pool={ctx.pool}
      />
    )
  },
})
