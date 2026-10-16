import { createFileRoute } from '@tanstack/react-router'

import { PageHeader, PageBody } from '@/components/page-header'
import { PremiumGate } from '@/components/premium-gate'
import { SoundMixer } from '@/components/soundscapes/sound-mixer'

export const Route = createFileRoute('/app/soundscapes')({
  component: SoundscapesPage,
})

function SoundscapesPage() {
  return (
    <>
      <PageHeader
        title="Soundscapes"
        description="A generative ambient mixer to set the room for deep work."
      />
      <PageBody className="px-0 py-0">
        <PremiumGate feature="soundscapes" className="m-6">
          <SoundMixer />
        </PremiumGate>
      </PageBody>
    </>
  )
}
