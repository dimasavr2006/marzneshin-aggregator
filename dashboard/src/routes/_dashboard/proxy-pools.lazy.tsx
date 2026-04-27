import { Page, Loading } from '@marzneshin/common/components'
import { PoolsTable } from '@marzneshin/modules/proxy-pool'
import { createLazyFileRoute, Outlet } from '@tanstack/react-router'
import { type FC, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { SudoRoute } from '@marzneshin/libs/sudo-routes'

export const ProxyPoolsPage: FC = () => {
  const { t } = useTranslation()
  return (
    <Page
      title={t('proxy_pools')}
      className="sm:w-screen md:w-full"
    >
      <PoolsTable />
      <Suspense fallback={<Loading />}>
        <Outlet />
      </Suspense>
    </Page>
  )
}

export const Route = createLazyFileRoute('/_dashboard/proxy-pools')({
  component: () => (
    <SudoRoute>
      <ProxyPoolsPage />
    </SudoRoute>
  ),
})
