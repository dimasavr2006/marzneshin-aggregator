import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { MutationDialog, useRouterPoolContext } from '@marzneshin/modules/proxy-pool'

export const Route = createFileRoute('/_dashboard/proxy-pools/$poolId/edit')({
  component: () => {
    const ctx = useRouterPoolContext()
    const navigate = useNavigate({ from: '/proxy-pools/$poolId/edit' })
    
    if (!ctx) return null
    
    return <MutationDialog entity={ctx.pool} onClose={() => navigate({ to: '/proxy-pools' })} />
  },
})
