import { createFileRoute } from '@tanstack/react-router'

import { LegalPage } from '@/components/legal-page'

export const Route = createFileRoute('/terms')({
  head: () => ({
    meta: [
      { title: 'Terms of Use — Thread' },
      { name: 'description', content: 'The terms that govern your use of Thread.' },
    ],
  }),
  component: TermsPage,
})

function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="14 October 2026">
      <p>
        These Terms of Use govern your access to and use of Thread. By creating an account or using
        the service, you agree to these terms. If you do not agree, please do not use Thread.
      </p>

      <h2>Your account</h2>
      <p>
        You are responsible for the activity on your account and for keeping your sign-in
        credentials secure. You must provide accurate information and be old enough to enter into a
        binding agreement in your jurisdiction.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Thread for any unlawful purpose or to infringe the rights of others.</li>
        <li>Attempt to disrupt, reverse engineer or gain unauthorised access to the service.</li>
        <li>Upload malicious code or content that harms other users or the platform.</li>
        <li>Resell or redistribute the service without our written permission.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        You retain ownership of the content you create in Thread. You grant us a limited licence to
        store, process and display that content solely to operate the service for you. You are
        responsible for the content you add and for ensuring you have the right to add it.
      </p>

      <h2>Premium and codes</h2>
      <p>
        Some features require a Premium plan, which may be unlocked through a redeem code or another
        offer we make available. Codes are personal, may not be resold, and may be revoked if used
        in breach of these terms. We may change or withdraw features over time.
      </p>

      <h2>Third-party services</h2>
      <p>
        Thread can connect to third-party services. Your use of those services is governed by their
        own terms, and we are not responsible for third-party content or availability.
      </p>

      <h2>Availability and warranties</h2>
      <p>
        Thread is provided “as is” without warranties of any kind. We do not guarantee that the
        service will be uninterrupted, error-free or that data will never be lost. Keep your own
        backups of anything important.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Thread and its operators will not be liable for any
        indirect, incidental or consequential damages arising from your use of the service.
      </p>

      <h2>Changes and termination</h2>
      <p>
        We may modify these terms or discontinue the service. If we make material changes, we will
        update the date above. You may stop using Thread and delete your account at any time.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms? Reach us at <a href="mailto:legal@thread.app">legal@thread.app</a>.
      </p>
    </LegalPage>
  )
}
