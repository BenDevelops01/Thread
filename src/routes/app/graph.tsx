import { createFileRoute } from '@tanstack/react-router'

import { PageHeader, PageBody } from '@/components/page-header'
import { PremiumGate } from '@/components/premium-gate'
import { GraphView } from '@/components/notes/graph-view'
import { graphQuery } from '@/lib/queries/notes'

export const Route = createFileRoute('/app/graph')({
  loader: ({ context }) => context.queryClient.ensureQueryData(graphQuery()),
  component: GraphPage,
})

function GraphPage() {
  return (
    <>
      <PageHeader
        title="Graph"
        description="Every note and every link between them."
      />
      <PageBody className="h-[calc(100vh-8.5rem)] px-0 py-0">
        <PremiumGate feature="graph" className="m-6">
          <GraphView />
        </PremiumGate>
      </PageBody>
    </>
  )
}
