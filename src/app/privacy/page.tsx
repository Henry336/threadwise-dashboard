import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bot, Database, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { ThreadwiseMark } from "@/components/threadwise-mark";

export const metadata: Metadata = {
  title: "Privacy explained",
  description: "A plain-language explanation of how Threadwise protects and processes your information.",
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header><Link href="/"><ThreadwiseMark /></Link><Link href="/"><ArrowLeft size={15} /> Back home</Link></header>
      <section className="privacy-hero">
        <span><ShieldCheck size={15} /> Plain-language privacy</span>
        <h1>Private by scope.<br /><em>Honest by design.</em></h1>
        <p>Here is exactly what Threadwise protects, what the service can access, and what happens when you connect another provider.</p>
      </section>
      <section className="privacy-grid">
        <article><Bot size={21} /><span>01</span><h2>Telegram signs you in</h2><p>Telegram authenticates your identity. Threadwise never receives or stores your Telegram password. Dashboard requests are scoped to the Telegram account that signed in.</p></article>
        <article><KeyRound size={21} /><span>02</span><h2>Connected tokens are encrypted</h2><p>OAuth tokens for connected providers are encrypted before they are stored. Supported connections can be disconnected from your settings.</p></article>
        <article><Database size={21} /><span>03</span><h2>Your content is not E2EE</h2><p>Saved Threadwise content is not end-to-end encrypted. A small number of authorized production operators can technically access it when necessary to operate, troubleshoot, or secure the service.</p></article>
        <article><Sparkles size={21} /><span>04</span><h2>AI features use relevant context</h2><p>If you use an AI-powered feature, the content relevant to that request may be sent to the configured AI provider. Ordinary dashboard browsing and non-AI actions do not require sending your content to an AI model.</p></article>
      </section>
      <section className="privacy-control">
        <div><span>Your controls</span><h2>You can leave with your data.</h2><p>From Dashboard → Settings → Data &amp; privacy, you can export a readable copy of your Threadwise data or permanently delete your account and stored content.</p></div>
        <a className="button button-primary" href="/api/auth/login">Continue with Telegram</a>
      </section>
      <footer><ThreadwiseMark /><p>This explanation is part of the product, not fine-print theatre.</p></footer>
    </main>
  );
}
