import { createFileRoute } from '@tanstack/react-router'

import { PageHeader, PageBody } from '@/components/page-header'
import { PremiumGate } from '@/components/premium-gate'
import { IntegrationsView } from '@/components/integrations/integrations-view'
import { integrationsQuery } from '@/lib/queries/integrations'

export const Route = createFileRoute('/app/plugins')({
  loader: ({ context }) => context.queryClient.ensureQueryData(integrationsQuery()),
  component: PluginsPage,
})

function PluginsPage() {
  return (
    <>
      <PageHeader
        title="Plugins"
        description="Connect GitHub, Vercel, Supabase, Linear, Notion — or any MCP server."
      />
      <PageBody className="px-0 py-0">
        <PremiumGate feature="integrations" className="m-6">
          <IntegrationsView />
        </PremiumGate>
      </PageBody>
    </>
  )
}
