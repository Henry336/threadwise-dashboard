import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardApp } from "@/components/dashboard-app";
import { Ari } from "@/components/ari";
import { getSelectedWorkspace, getSessionUser } from "@/lib/auth";
import { DashboardDataContractError, ThreadwiseApiError, getDashboardSnapshot, getDashboardWorkspaces } from "@/lib/threadwise-api";
import type { DashboardWorkspace } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ demo?: string; view?: string }> }) {
  const params = await searchParams;
  const session = await getSessionUser();
  const isDemo = params.demo === "1" || params.demo === "group";
  if (!session && !isDemo) redirect("/");
  const selectedWorkspace = isDemo ? (params.demo === "group" ? "group" : "personal") : await getSelectedWorkspace();

  let snapshot = null;
  let workspaces: DashboardWorkspace[] = [];
  let failure: "authentication" | "data" | "service" = "service";
  try {
    [snapshot, workspaces] = await Promise.all([
      getDashboardSnapshot(session, { demo: isDemo, workspace: selectedWorkspace }),
      isDemo ? Promise.resolve([]) : getDashboardWorkspaces(session),
    ]);
  } catch (error) {
    failure = error instanceof DashboardDataContractError
      ? "data"
      : error instanceof ThreadwiseApiError && (error.status === 401 || error.status === 403)
        ? "authentication"
        : "service";
    console.error("Dashboard snapshot load failed.", {
      errorType: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown dashboard error",
    });
  }
  if (!snapshot) {
    const copy = failure === "data"
      ? {
          eyebrow: "Account connected",
          title: "One saved preference needs an update.",
          body: "Threadwise received your account data, but an older preference could not be displayed. Your tasks, notes, and ideas are untouched.",
        }
      : failure === "authentication"
        ? {
            eyebrow: "Secure connection rejected",
            title: "Threadwise needs a fresh dashboard connection.",
            body: "Your Telegram sign-in succeeded, but the private dashboard API did not accept this request. Retry once; if it persists, reopen Dashboard from the bot.",
          }
        : {
            eyebrow: "Service temporarily unavailable",
            title: "Threadwise could not load your workspace just now.",
            body: "Your account is still connected and your data is safe. Retry the request or use the demo while the service recovers.",
          };
    return (
      <main className="data-error-shell">
        <div className="data-error-card">
          <Ari variant="avatar-light" className="data-error-ari" decorative />
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <div><Link className="button button-primary" href="/dashboard">Retry</Link>{selectedWorkspace !== "personal" && <Link className="button button-quiet" href="/api/workspace/select?workspace=personal&next=/dashboard">Open personal workspace</Link>}<Link className="button button-quiet" href="/dashboard?demo=1">Open the demo</Link><Link className="button button-quiet" href="/">Back home</Link></div>
        </div>
      </main>
    );
  }
  const availableWorkspaces = workspaces.length ? workspaces : [snapshot.workspace];
  return <DashboardApp initialData={snapshot} workspaces={availableWorkspaces} isDemo={isDemo} initialView={params.view} />;
}
