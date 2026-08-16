import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowLeftIcon,
  FileTextIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
} from "lucide-react"

import ModeToggle from "@/components/shared/mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Terms and Conditions | Pusat Mail",
  description:
    "Terms of Service, Privacy Policy, and Abuse Policy for Pusat.Email.",
}

const updatedAt = "16 August 2026"

const listClassName =
  "ml-5 list-disc space-y-2 marker:text-primary text-muted-foreground"

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-svh bg-muted dark:bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-4 sm:px-6 lg:px-0">
          <Link href="/" aria-label="Pusat Mail home" className="shrink-0">
            <Image
              src="/ic_tmail.svg"
              alt="Pusat Mail"
              width={40}
              height={40}
              className="size-10"
              priority
            />
          </Link>
          <span className="text-sm font-semibold">Pusat Mail</span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button asChild variant="secondary">
              <Link href="/">
                <ArrowLeftIcon data-icon="inline-start" />
                <span className="hidden sm:inline">Return to Home</span>
                <span className="sm:hidden">Home</span>
              </Link>
            </Button>
            <ModeToggle />
          </div>
        </nav>
      </header>

      <main className="relative mx-auto w-full max-w-4xl space-y-5 px-4 py-8 sm:px-6 sm:py-12 lg:px-0">
        <div
          className="pointer-events-none absolute inset-x-16 top-0 -z-0 h-48 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />

        <Card className="relative border border-border/60 bg-card/95">
          <CardHeader className="gap-3 px-5 sm:px-7">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <FileTextIcon className="size-5" />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Terms and Conditions
              </CardTitle>
              <CardDescription className="max-w-2xl leading-6">
                Please read the Terms of Service, Privacy Policy, and Abuse
                Policy that apply when you use Pusat.Email.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 px-5 sm:px-7">
            <Button asChild variant="secondary" size="sm">
              <a href="#terms">Terms of Service</a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="#privacy">Privacy Policy</a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="#abuse">Abuse Policy</a>
            </Button>
          </CardContent>
        </Card>

        <Card
          id="terms"
          className="scroll-mt-24 border border-border/60 bg-card/95"
        >
          <CardHeader className="border-b px-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <FileTextIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl">Terms of Service</CardTitle>
                <CardDescription>Last Updated: {updatedAt}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-5 leading-7 sm:px-7">
            <div className="space-y-3">
              <p>
                Welcome to Pusat.Email, a temporary email service by
                Premiumisme.
              </p>
              <p className="text-muted-foreground">
                By using Pusat.Email, you agree to these Terms. If you do not
                agree, please do not use the service.
              </p>
            </div>

            <LegalSection title="Use of the Service">
              <p>
                Pusat.Email is designed for temporary email use, such as
                verification, testing, privacy, and reducing unwanted email.
              </p>
              <p>
                You are responsible for how you use the service and must comply
                with applicable laws and the rules of any third-party service
                you use.
              </p>
            </LegalSection>

            <LegalSection title="Prohibited Use">
              <p>You may not use Pusat.Email for:</p>
              <ul className={listClassName}>
                <li>Fraud, scams, or phishing.</li>
                <li>Spam or mass abuse.</li>
                <li>Malware or harmful content.</li>
                <li>Impersonation or deception.</li>
                <li>Unauthorized access to systems or accounts.</li>
                <li>
                  Bypassing security, verification, or restrictions of other
                  services.
                </li>
                <li>Harassment, threats, or other harmful activity.</li>
                <li>Any illegal activity.</li>
              </ul>
              <p>
                We may restrict or block access when we detect or receive
                reports of abuse.
              </p>
            </LegalSection>

            <LegalSection title="Temporary Nature">
              <p>
                Pusat.Email provides temporary email addresses and inboxes.
                Messages or addresses may expire or be removed at any time.
              </p>
              <p>
                We do not guarantee email delivery, inbox availability, message
                retention, or compatibility with any third-party service.
              </p>
              <p>
                Do not use Pusat.Email for important accounts, account recovery,
                banking, financial information, or anything that requires
                long-term access.
              </p>
            </LegalSection>

            <LegalSection title="Third-Party Services">
              <p>
                Some websites may block or restrict temporary email addresses.
                Pusat.Email does not control these decisions and is not
                responsible for restrictions imposed by third-party services.
              </p>
            </LegalSection>

            <LegalSection title="Service Changes">
              <p>
                We may modify, limit, suspend, or discontinue any part of
                Pusat.Email at any time.
              </p>
              <p>
                We may also update these Terms when necessary. Continued use of
                the service means you accept the updated Terms.
              </p>
            </LegalSection>

            <LegalSection title="Contact">
              <p>
                For questions, abuse reports, or other concerns, please contact
                us through the available contact channel on Pusat.Email.
              </p>
              <p className="font-medium text-foreground">
                Use Pusat.Email responsibly.
              </p>
            </LegalSection>
          </CardContent>
        </Card>

        <Card
          id="privacy"
          className="scroll-mt-24 border border-border/60 bg-card/95"
        >
          <CardHeader className="border-b px-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <LockKeyholeIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl">Privacy Policy</CardTitle>
                <CardDescription>Last Updated: {updatedAt}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-5 leading-7 sm:px-7">
            <div className="space-y-3">
              <p>At Pusat.Email, we value simplicity and privacy.</p>
              <p className="text-muted-foreground">
                This Privacy Policy explains, in simple terms, how information
                may be handled when you use our temporary email service.
              </p>
            </div>

            <LegalSection title="Information We May Process">
              <p>Depending on how you use Pusat.Email, we may process:</p>
              <ul className={listClassName}>
                <li>Temporary email addresses.</li>
                <li>Emails and attachments received through our service.</li>
                <li>
                  Technical information such as IP address, browser, device, and
                  access time.
                </li>
                <li>Information you provide when contacting us.</li>
                <li>Cookies or similar technologies used by the website.</li>
              </ul>
            </LegalSection>

            <LegalSection title="How We Use Information">
              <p>Information may be used to:</p>
              <ul className={listClassName}>
                <li>Provide and operate the email service.</li>
                <li>Display incoming messages.</li>
                <li>Maintain and improve the website.</li>
                <li>Prevent spam, abuse, and malicious activity.</li>
                <li>Monitor service security and performance.</li>
                <li>Respond to support or abuse reports.</li>
                <li>Comply with applicable legal requirements.</li>
              </ul>
            </LegalSection>

            <LegalSection title="Temporary Email Data">
              <p>Pusat.Email is a temporary email service.</p>
              <p>
                Email addresses and messages may only be available for a limited
                period and may be automatically deleted or removed.
              </p>
              <p>
                Temporary inboxes should not be used for sensitive or important
                information.
              </p>
            </LegalSection>

            <LegalSection title="Security and Abuse Prevention">
              <p>
                We may process certain technical information when necessary to
                protect Pusat.Email, prevent abuse, investigate suspicious
                activity, or maintain service security.
              </p>
            </LegalSection>

            <LegalSection title="Third-Party Services">
              <p>
                Pusat.Email may use third-party services for hosting, analytics,
                security, advertising, or other website functionality.
              </p>
              <p>
                These services may process information according to their own
                privacy policies.
              </p>
            </LegalSection>

            <LegalSection title="Data Retention">
              <p>
                We retain information only for as long as reasonably necessary
                for service operation, security, abuse prevention, support, or
                legal obligations.
              </p>
              <p>
                Temporary email content may be deleted automatically according
                to the service&apos;s retention system.
              </p>
            </LegalSection>

            <LegalSection title="Your Privacy">
              <p>
                We aim to keep the amount of information processed by
                Pusat.Email reasonable and relevant to operating the service.
              </p>
              <p>
                If you have a privacy-related question or request, please
                contact us through the available contact channel.
              </p>
            </LegalSection>

            <LegalSection title="Changes">
              <p>
                This Privacy Policy may be updated from time to time. The latest
                version will always be published on this page.
              </p>
              <p className="font-medium text-foreground">
                Your privacy matters.
              </p>
            </LegalSection>
          </CardContent>
        </Card>

        <Card
          id="abuse"
          className="scroll-mt-24 border border-border/60 bg-card/95"
        >
          <CardHeader className="border-b px-5 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <ShieldCheckIcon className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xl">Abuse Policy</CardTitle>
                <CardDescription>Last Updated: {updatedAt}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 px-5 leading-7 sm:px-7">
            <p>
              Pusat.Email does not allow its service to be used for abuse,
              fraud, or illegal activity.
            </p>

            <LegalSection title="Prohibited Activities">
              <p>Our service must not be used for:</p>
              <ul className={listClassName}>
                <li>Phishing or credential theft.</li>
                <li>Fraud, scams, or impersonation.</li>
                <li>Spam or mass abuse.</li>
                <li>Malware or malicious links.</li>
                <li>Account takeover attempts.</li>
                <li>Harassment or threats.</li>
                <li>Unauthorized access or attacks.</li>
                <li>Bypassing security or restrictions.</li>
                <li>Any other illegal or harmful activity.</li>
              </ul>
            </LegalSection>

            <LegalSection title="Report Abuse">
              <p>
                If you believe an email address or message using Pusat.Email has
                been involved in abuse, please report it to us.
              </p>
              <p>To help us investigate, please include:</p>
              <ul className={listClassName}>
                <li>The temporary email address.</li>
                <li>Date and time of the incident.</li>
                <li>Related website or URL.</li>
                <li>A short explanation of the issue.</li>
                <li>Supporting evidence, if available.</li>
              </ul>
            </LegalSection>

            <LegalSection title="Our Response">
              <p>
                We review abuse reports and may take appropriate action,
                including:
              </p>
              <ul className={listClassName}>
                <li>Blocking an email address or domain.</li>
                <li>Restricting access.</li>
                <li>Removing related data.</li>
                <li>Blocking abusive traffic.</li>
                <li>Taking additional measures when necessary.</li>
              </ul>
              <p>
                We may also cooperate with legitimate legal or security requests
                where required.
              </p>
            </LegalSection>

            <LegalSection title="Important">
              <p>
                Please do not send sensitive personal information when
                submitting an abuse report unless it is necessary for the
                investigation.
              </p>
              <p className="font-medium text-foreground">
                Help us keep Pusat.Email safe and reliable.
              </p>
            </LegalSection>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function LegalSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2.5 text-muted-foreground">{children}</div>
    </section>
  )
}
