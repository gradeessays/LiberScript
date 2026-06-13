import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | LiberScript',
  description: 'The terms that apply to using LiberScript, including plans, billing, content ownership, and account rules.',
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: June 13, 2026</p>

      <div className="mt-8 space-y-10 text-sm text-muted-foreground">
        <p>
          These terms govern your use of LiberScript. By creating an account, you agree to them, along with our{' '}
          <Link href="/privacy" className="font-medium text-primary hover:underline">
            Privacy Policy
          </Link>
          . If you do not agree, please do not use LiberScript.
        </p>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Accounts</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>You must provide accurate information when creating an account and keep it up to date.</li>
            <li>You are responsible for keeping your password secure and for all activity that happens under your account.</li>
            <li>You must be legally able to enter into a contract in your jurisdiction to use LiberScript.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Plans and billing</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              LiberScript is sold as fixed-price passes (Day, Week, Month, or Year). Each pass grants full access to
              the toolkit for the stated period.
            </li>
            <li>Plans do not auto-renew. There is no recurring subscription and nothing to cancel.</li>
            <li>
              If you purchase a new pass while an existing pass is still active, the new time is added to the end
              of your current period.
            </li>
            <li>
              Payments are processed by Stripe, PayPal, or Paystack. Your relationship with these providers for
              payment processing is also governed by their own terms.
            </li>
            <li>
              Because a pass grants immediate access to the full toolkit, purchases are final and non-refundable,
              except where required by applicable law or where we determine, at our discretion, that a billing
              error occurred.
            </li>
            <li>
              If your plan expires, your projects and files remain in place for a 7-day grace period before they
              are permanently deleted, as described in the{' '}
              <Link href="/privacy" className="font-medium text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Your content</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>
              You retain all ownership rights to the manuscripts, covers, and other content you create or upload to
              LiberScript.
            </li>
            <li>
              You grant LiberScript a limited license to store, process, and display your content solely for the
              purpose of providing the service to you, for example, rendering previews and generating exports.
            </li>
            <li>
              You are responsible for making sure you have the necessary rights to any content you upload,
              including text, images, and fonts.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">AI features and third-party providers</h2>
          <p className="mt-3">
            AI-assisted writing, critique suggestions, and metadata tools work by sending relevant content to the AI
            provider (OpenAI, Anthropic, Gemini, or OpenRouter) associated with the API key you connect. Your use of
            these providers is subject to their own terms and pricing, and you are responsible for any costs they
            charge. LiberScript is not responsible for the accuracy, quality, or content of AI-generated output, and
            any suggestions should be reviewed by you before use.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Acceptable use</h2>
          <p className="mt-3">You agree not to use LiberScript to:</p>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Upload or create content that is illegal, infringes on someone else&apos;s rights, or that you do not have permission to use.</li>
            <li>Attempt to disrupt, overload, or gain unauthorized access to LiberScript&apos;s systems or other users&apos; accounts.</li>
            <li>Use automated tools to scrape, copy, or interfere with the service outside of normal use.</li>
            <li>Resell or sublicense access to LiberScript without our written permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Disclaimers</h2>
          <p className="mt-3">
            LiberScript is provided on an &quot;as is&quot; and &quot;as available&quot; basis. The critique engine and design tools are
            aids for self-published authors and do not constitute professional editorial, legal, or publishing
            advice. We do not guarantee that any platform (including Amazon KDP, IngramSpark, Draft2Digital, Kobo, or
            others) will accept files exported from LiberScript, since each platform sets and changes its own
            requirements.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Limitation of liability</h2>
          <p className="mt-3">
            To the maximum extent permitted by law, LiberScript and its team are not liable for any indirect,
            incidental, or consequential damages arising from your use of the service, including loss of data,
            revenue, or publishing opportunities. Our total liability for any claim relating to LiberScript is
            limited to the amount you paid for the plan giving rise to the claim.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Termination</h2>
          <p className="mt-3">
            You may stop using LiberScript at any time. We may suspend or terminate accounts that violate these
            terms, including the acceptable use rules above. If your account is terminated for a violation, any
            remaining time on your current pass is forfeited.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Changes to these terms</h2>
          <p className="mt-3">
            We may update these terms from time to time. If we make material changes, we will update the date at the
            top of this page and, where appropriate, notify you by email. Continuing to use LiberScript after a
            change takes effect means you accept the updated terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold text-foreground">Contact</h2>
          <p className="mt-3">
            Questions about these terms can be sent to{' '}
            <a href="mailto:support@liberscript.com" className="font-medium text-primary hover:underline">
              support@liberscript.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
