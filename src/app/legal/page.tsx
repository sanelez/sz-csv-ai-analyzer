import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Shield, Database, Lock, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Legal & Privacy - CSV AI Analyzer",
  description:
    "Privacy policy and legal information for CSV AI Analyzer. Your data stays in your browser.",
};

export default function LegalPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 to-black p-4 text-white md:p-8">
      <div className="mx-auto max-w-3xl">
        {/* Back Button */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App
        </Link>

        <h1 className="mb-8 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-4xl font-bold text-transparent">
          Legal & Privacy
        </h1>

        <div className="space-y-8">
          {/* Privacy Section */}
          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 p-2">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <h2 className="text-xl font-semibold">Privacy Policy</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                CSV AI Analyzer is designed with privacy as a core principle. We
                believe your data is yours and should stay that way.
              </p>
              <h3 className="mt-4 font-medium text-white">
                What we DON&apos;T store:
              </h3>
              <ul className="list-inside list-disc space-y-1 text-gray-400">
                <li>Your CSV files or any data you upload</li>
                <li>Your API keys on our servers</li>
                <li>Analysis results or chat history</li>
                <li>Any personally identifiable information</li>
              </ul>
            </div>
          </section>

          {/* Data Processing Section */}
          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/20 p-2">
                <Database className="h-5 w-5 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold">
                How Your Data is Processed
              </h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                All data processing happens{" "}
                <strong className="text-white">100% in your browser</strong>.
                Here&apos;s how it works:
              </p>
              <ol className="list-inside list-decimal space-y-2 text-gray-400">
                <li>
                  You upload a CSV file → it stays in your browser&apos;s memory
                </li>
                <li>
                  When you request AI analysis → only a summary is sent to the
                  AI provider
                </li>
                <li>
                  Your API key is stored in a secure browser cookie → never sent
                  to us
                </li>
                <li>When you close the browser tab → all data is gone</li>
              </ol>
            </div>
          </section>

          {/* Third Party Section */}
          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-violet-500/30 bg-violet-500/20 p-2">
                <ExternalLink className="h-5 w-5 text-violet-400" />
              </div>
              <h2 className="text-xl font-semibold">Third-Party Services</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                When you use AI features, your data is sent directly from your
                browser to:
              </p>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <h4 className="mb-2 font-medium text-white">OpenAI</h4>
                <p className="text-sm text-gray-400">
                  AI analysis is powered by OpenAI&apos;s API. Your data
                  summaries are processed according to
                  <a
                    href="https://openai.com/policies/privacy-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-violet-400 hover:text-violet-300"
                  >
                    OpenAI&apos;s Privacy Policy
                  </a>
                  .
                </p>
              </div>
              <p className="text-sm text-gray-500">
                We recommend reviewing OpenAI&apos;s data retention policies if
                you&apos;re processing sensitive data.
              </p>
            </div>
          </section>

          {/* API Key Security */}
          <section className="glass-card p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/20 p-2">
                <Lock className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold">API Key Security</h2>
            </div>
            <div className="space-y-4 text-gray-300">
              <p>
                Your OpenAI API key is stored in a browser cookie with the
                following security measures:
              </p>
              <ul className="list-inside list-disc space-y-1 text-gray-400">
                <li>
                  <code className="rounded bg-white/10 px-1 text-xs">
                    Secure
                  </code>{" "}
                  flag: Only transmitted over HTTPS
                </li>
                <li>
                  <code className="rounded bg-white/10 px-1 text-xs">
                    SameSite=Strict
                  </code>
                  : Prevents cross-site request forgery
                </li>
                <li>Never sent to our servers</li>
                <li>API calls are made directly from your browser to OpenAI</li>
              </ul>
            </div>
          </section>

          {/* Contact */}
          <section className="glass-card p-6">
            <h2 className="mb-4 text-xl font-semibold">Contact</h2>
            <p className="text-gray-300">
              If you have any questions about our privacy practices, please open
              an issue on our GitHub repository.
            </p>
          </section>

          {/* Footer */}
          <p className="py-8 text-center text-sm text-gray-500">
            Last updated: December 2025
          </p>
        </div>
      </div>
    </main>
  );
}
