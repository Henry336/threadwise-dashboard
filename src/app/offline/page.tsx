import Link from "next/link";
import { Ari } from "@/components/ari";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return <main className="tw-offline">
    <section>
      <Ari variant="avatar-light" decorative />
      <h1>You’re offline.</h1>
      <p>Reconnect to load your Threadwise workspace.</p>
      <Link href="/dashboard">Try again</Link>
    </section>
  </main>;
}

