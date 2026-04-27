import { createFileRoute } from '@tanstack/react-router'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'
import { MutationDialog } from '@marzneshin/modules/proxy-pool/dialogs/mutation'

export const Route = createFileRoute('/_dashboard/proxy-pools/create')({
  component: () => {
    const navigate = useNavigate({ from: '/proxy-pools/create' })
    
    const onClose = useCallback(() => {
      navigate({ to: '/proxy-pools' })
    }, [navigate])

    return <MutationDialog entity={null} onClose={onClose} />
  },
})
