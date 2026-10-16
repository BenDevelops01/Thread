import { createFileRoute } from '@tanstack/react-router'

import { LegalPage } from '@/components/legal-page'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: 'Privacy Policy — Thread' },
      {
        name: 'description',
        content: 'How Thread collects, uses and protects your data.',
      },
    ],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="14 October 2026">
      <p>
        Thread is built to be a quiet, private workspace. This policy explains what we collect, why
        we collect it, and the control you have over your information. We aim to collect as little
        as possible to run the service.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details.</strong> Your email address and, if you sign in with a provider
          such as Google, GitHub or Discord, the basic profile information that provider shares with
          us (such as your name and avatar).
        </li>
        <li>
          <strong>Content you create.</strong> Notes, tasks, journal entries, focus sessions,
          soundscape mixes and connected activity that you save to your workspace.
        </li>
        <li>
          <strong>Connection data.</strong> If you connect a third-party service, we store the
          access token you provide so we can sync activity on your behalf, along with the events we
          import.
        </li>
        <li>
          <strong>Technical data.</strong> Minimal diagnostics needed to keep the service running
          and secure, such as error logs.
        </li>
      </ul>

      <h2>How we use your information</h2>
      <p>
        We use your information solely to provide and improve Thread: to authenticate you, store and
        sync your workspace, display your activity, and keep the service secure. We do not sell your
        personal information, and we do not use your content to train advertising profiles.
      </p>

      <h2>Where your data lives</h2>
      <p>
        Your workspace data is stored with our database provider, Supabase, and the application is
        served by Vercel. Data is transmitted over encrypted connections (HTTPS/TLS) and stored in
        access-controlled systems. Row-level security ensures your content is only visible to your
        own account.
      </p>

      <h2>Third-party connections</h2>
      <p>
        When you connect a service such as GitHub or Vercel, you authorise Thread to read the
        specific data described at the point of connection. You can disconnect any integration at
        any time from the Plugins page, which revokes our stored token and stops future syncs.
      </p>

      <h2>Data retention and deletion</h2>
      <p>
        We keep your data for as long as your account exists. You can permanently delete your
        account and all associated content at any time from Settings → Account. Deletion is
        immediate and irreversible.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, export or delete
        your personal information. You can exercise most of these directly in the app, or contact us
        for assistance.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we will make the
        updated version available in the app and revise the date above.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Reach us at <a href="mailto:privacy@thread.app">privacy@thread.app</a>.
      </p>
    </LegalPage>
  )
}
