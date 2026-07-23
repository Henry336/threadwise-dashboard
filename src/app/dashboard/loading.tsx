import { AriUntangleLoader } from "@/components/ari";

export default function DashboardLoading() {
  return (
    <main className="tw-route-loading">
      <AriUntangleLoader label="Untangling your workspace…" />
    </main>
  );
}
