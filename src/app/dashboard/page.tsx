import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/components/dashboard-app";
import { getSessionUser } from "@/lib/auth";
import { getDashboardSnapshot } from "@/lib/threadwise-api";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string; view?: string }> }) {
  const params = await searchParams;
  const session = await getSessionUser();
  const isDemo = params.demo === "1";
  if (!session && !isDemo) redirect("/");

  const snapshot = await getDashboardSnapshot(session, { demo: isDemo }).catch(() => null);
  if (!snapshot) {
    return (
      <main className="data-error-shell">
        <div className="data-error-card">
          <span className="eyebrow">Connection not ready</span>
          <h1>Threadwise could not reconnect just now.</h1>
          <p>Your data is still safe. Refresh in a moment or open the demo while the secure server connection recovers; no database credentials are exposed to this browser.</p>
          <div><Link className="button button-primary" href="/dashboard?demo=1">Open the demo</Link><Link className="button button-quiet" href="/">Back home</Link></div>
        </div>
      </main>
    );
  }
  return <DashboardApp initialData={snapshot} isDemo={isDemo} initialView={params.view} />;
}
