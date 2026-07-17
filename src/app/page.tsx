import Link from "next/link";
import { ArrowUpRight, Check, Command, Layers3, LockKeyhole, Sparkles } from "lucide-react";
import { ThreadwiseMark } from "@/components/threadwise-mark";
import { getSessionUser, isTelegramAuthConfigured } from "@/lib/auth";

export default async function Home({ searchParams }: { searchParams: Promise<{ authError?: string }> }) {
  const session = await getSessionUser();
  const { authError } = await searchParams;
  const authReady = isTelegramAuthConfigured();

  return (
    <div className="landing-shell">
      <header className="landing-nav">
        <ThreadwiseMark />
        <div className="landing-nav-actions">
          <span className="landing-status"><span /> Works with Telegram</span>
          <Link className="button button-quiet" href={session ? "/dashboard" : "/dashboard?demo=1"}>
            {session ? "Open dashboard" : "View the demo"}
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="hero-copy">
            <span className="eyebrow"><Sparkles size={14} /> A calmer home for your captures</span>
            <h1>Your day,<br /><em>untangled.</em></h1>
            <p>Tasks, notes, ideas, reminders, and spending—pulled out of chat and arranged around what matters now.</p>
            {authError && <p className="auth-notice" role="alert">Telegram sign-in could not be completed. Please try again.</p>}
            <div className="hero-actions">
              {session ? (
                <Link className="button button-primary" href="/dashboard">Continue as {session.firstName}<ArrowUpRight size={17} /></Link>
              ) : authReady ? (
                <a className="button button-primary" href="/api/auth/login">Continue with Telegram<ArrowUpRight size={17} /></a>
              ) : (
                <Link className="button button-primary" href="/dashboard?demo=1">Explore the demo<ArrowUpRight size={17} /></Link>
              )}
              <Link className="hero-footnote" href="/privacy"><LockKeyhole size={14} /> See exactly what “private” means <ArrowUpRight size={13} /></Link>
            </div>
          </div>

          <div className="preview-wrap" aria-label="Threadwise dashboard preview">
            <div className="preview-orbit preview-orbit-one" />
            <div className="preview-orbit preview-orbit-two" />
            <div className="preview-window">
              <div className="preview-sidebar">
                <ThreadwiseMark compact />
                {["Today", "Tasks", "Notes", "Ideas"].map((item, index) => (
                  <span className={index === 0 ? "active" : ""} key={item}><i />{item}</span>
                ))}
              </div>
              <div className="preview-main">
                <div className="preview-top"><small>THURSDAY · 16 JULY</small><span>M</span></div>
                <h2>Good morning, Maya.</h2>
                <p>Your day has a little shape to it.</p>
                <div className="preview-command"><Command size={15} /><b>Add anything…</b><kbd>⌘ K</kbd></div>
                <div className="preview-grid">
                  <div className="preview-focus">
                    <small>NEEDS ATTENTION</small>
                    <b>Review the launch copy</b>
                    <p>Due at 11:30 AM</p>
                    <button><Check size={13} /> Mark complete</button>
                  </div>
                  <div className="preview-stat"><span>Today</span><b>3</b><small>things ahead</small></div>
                  <div className="preview-stat"><span>Notes</span><b>18</b><small>in your library</small></div>
                </div>
              </div>
            </div>
            <div className="preview-float"><Layers3 size={16} /><span><b>Captured from Telegram</b><small>“Remember to pick up my parcel”</small></span></div>
          </div>
        </section>

        <section className="landing-principles" aria-label="Product principles">
          <div><span>01</span><h3>Capture once</h3><p>Keep using Telegram exactly as you do now.</p></div>
          <div><span>02</span><h3>See clearly</h3><p>A personal view shaped by urgency and context.</p></div>
          <div><span>03</span><h3>Act quickly</h3><p>Finish, snooze, search, and return to your day.</p></div>
        </section>
        <section className="landing-privacy">
          <div><LockKeyhole size={20} /><span><b>Telegram signs you in. Threadwise never sees your Telegram password.</b><small>Your data is user-scoped, provider tokens are encrypted, and stored content is not end-to-end encrypted.</small></span></div>
          <Link href="/privacy">Read the plain-language privacy explanation <ArrowUpRight size={15} /></Link>
        </section>
      </main>

      <footer className="landing-footer">
        <ThreadwiseMark />
        <p><Link href="/privacy">Privacy explained</Link> · Quietly keeping track.</p>
      </footer>
    </div>
  );
}
