import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { DeleteConfirmationDialog, useRouterPoolContext } from '@marzneshin/modules/proxy-pool'

export const Route = createFileRoute('/_dashboard/proxy-pools/$poolId/delete')({
  component: () => {
    const ctx = useRouterPoolContext()
    const navigate = useNavigate({ from: '/proxy-pools/$poolId/delete' })
    
    if (!ctx) return null
    
    return (
      <DeleteConfirmationDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) navigate({ to: '/proxy-pools' })
        }}
        entity={ctx.pool}
        onClose={() => navigate({ to: '/proxy-pools' })}
      />
    )
  },
})
