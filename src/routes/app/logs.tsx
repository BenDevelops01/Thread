import { createFileRoute } from '@tanstack/react-router'

import { PageHeader, PageBody } from '@/components/page-header'
import { LogsView } from '@/components/logs/logs-view'

export const Route = createFileRoute('/app/logs')({
  component: LogsPage,
})

function LogsPage() {
  return (
    <>
      <PageHeader
        title="Logs"
        description="A running record of what you and your integrations did."
      />
      <PageBody className="px-0 py-0">
        <LogsView />
      </PageBody>
    </>
  )
}
