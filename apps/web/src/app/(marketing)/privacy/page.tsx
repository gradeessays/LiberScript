import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | LiberScript',
  description: 'How LiberScript collects, uses, stores, and protects your account, manuscript, and payment information.',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 13, 2026</p>

      <div className="mt-8 space-y-10 text-sm text-muted-foreground">
        <p>
          This policy describes what information LiberScript collects, how it is used, and how long it is kept.
          It applies to the LiberScript web application and the accounts, manuscripts, and files you create within
          it.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Information we collect</h2>
          <ul className="mt-3 space-y-3">
            <li>
              <span className="font-medium text-foreground">Account information.</span> Your name, email address,
              and a securely hashed password, or your Google account details if you sign in with Google. We never
              store your password in plain text.
            </li>
            <li>
              <span className="font-medium text-foreground">Manuscript content.</span> The chapters, titles, cover
              details, and other content you create or upload, so your projects are saved and available the next
              time you sign in.
            </li>
            <li>
              <span className="font-medium text-foreground">AI provider keys.</span> If you choose to connect your
              own OpenAI, Anthropic, Gemini, or OpenRouter API key, it is encrypted at rest using AES-256-GCM before
              it is stored. We keep only the encrypted value and the last four characters, for display purposes.
            </li>
            <li>
              <span className="font-medium text-foreground">Billing information.</span> Payments are processed
              directly by Stripe, PayPal, or Paystack, depending on your region and chosen method. LiberScript does
              not receive or store your full card number.
            </li>
            <li>
              <span className="font-medium text-foreground">Usage and technical data.</span> Basic information such
              as IP address, browser type, and access timestamps, used for security, troubleshooting, and keeping
              the service reliable.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">How we use your information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>To provide the editor, critique, design, and export features of LiberScript.</li>
            <li>To process payments and apply the correct plan and access level to your account.</li>
            <li>
              To send account-related emails, including email verification, password resets, team invitations, and
              plan expiration reminders.
            </li>
            <li>To maintain the security and integrity of your account and our systems.</li>
            <li>To respond to support requests you send us directly.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Cookies and sessions</h2>
          <p className="mt-3">
            LiberScript uses a session cookie to keep you signed in between visits. This cookie is required for the
            app to function and is not used for advertising or for tracking you across other websites. We do not
            use third-party advertising trackers.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Data retention and deletion</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Your projects remain on your account for as long as you have an active plan.</li>
            <li>
              If your plan expires, your projects and files remain in place for a 7-day grace period. During this
              time you can reactivate your plan to restore full access, or export your manuscripts.
            </li>
            <li>
              If a plan is not renewed within the grace period, the associated projects, manuscripts, and stored
              files are permanently deleted.
            </li>
            <li>
              You can export your manuscripts as EPUB, print PDF, or DOCX at any time while your plan is active, so
              your work is never trapped in LiberScript.
            </li>
            <li>
              You can request deletion of your account and associated data at any time by contacting us at the
              address below.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Sharing your information</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>We do not sell your personal information.</li>
            <li>
              We share information only with the service providers needed to operate LiberScript: payment
              processors (Stripe, PayPal, Paystack), email delivery providers, and cloud hosting and storage
              providers, each under their own confidentiality and security obligations.
            </li>
            <li>
              If you use an AI feature with your own API key, the relevant manuscript content for that request is
              sent directly to the AI provider you selected, using your key. We do not share your AI key with
              anyone, including the provider&apos;s other customers.
            </li>
            <li>We may disclose information if required to do so by law or to protect the rights and safety of LiberScript and its users.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Your rights</h2>
          <p className="mt-3">
            You can access, correct, export, or delete your account information at any time. To exercise any of
            these rights, contact us using the details below and we will respond as quickly as we can.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Changes to this policy</h2>
          <p className="mt-3">
            If we make material changes to this policy, we will update the date at the top of this page and, where
            appropriate, notify you by email.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Questions about this policy or your data can be sent to{' '}
            <a href="mailto:privacy@liberscript.com" className="font-medium text-primary hover:underline">
              privacy@liberscript.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
