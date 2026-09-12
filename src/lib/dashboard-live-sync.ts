/** Shared Personal/Group/Study background synchronization.
 * Hidden/offline pages hold no EventSource or reconciliation timer. Returning to
 * the page refreshes immediately; visible pages reconcile at most every 5 minutes
 * in addition to server change notifications. No credentials or data are cached.
 */
export function startDashboardLiveSync(options: {
  refresh: () => Promise<unknown>;
  onLive: () => void;
  onRetry: () => void;
}): () => void {
  let events: EventSource | undefined;
  let reconcile: ReturnType<typeof setInterval> | undefined;
  let disposed = false;
  let refreshing = false;
  let changeQueued = false;
  let lastRefreshAt = -Infinity;
  const visible = () => document.visibilityState === "visible" && navigator.onLine !== false;
  const refresh = async (contentChanged = false) => {
    // Focus + visibility + reconnect often arrive together. Coalesce these
    // signals without suppressing ordinary explicit Save/refresh operations.
    if (disposed || !visible()) return;
    if (refreshing) { changeQueued ||= contentChanged; return; }
    if (!contentChanged && Date.now() - lastRefreshAt < 1_000) return;
    refreshing = true;
    lastRefreshAt = Date.now();
    try { await options.refresh(); } catch { if (!disposed && visible()) options.onRetry(); }
    finally {
      refreshing = false;
      // A content notification arriving during an older fetch must not be lost.
      // Keep one trailing refresh, rather than starting overlapping requests.
      if (changeQueued) { changeQueued = false; void refresh(true); }
    }
  };
  const stop = () => {
    changeQueued = false;
    events?.close();
    events = undefined;
    if (reconcile !== undefined) clearInterval(reconcile);
    reconcile = undefined;
  };
  const start = () => {
    if (disposed || !visible() || events) return;
    const source = new EventSource("/api/threadwise/events");
    events = source;
    let readyReceived = false;
    let interrupted = false;
    source.addEventListener("ready", () => {
      if (events !== source) return;
      options.onLive();
      // A reconnected stream establishes a new baseline, not a refresh event.
      // Fetch once so changes made during the outage cannot be missed.
      if (readyReceived || interrupted) void refresh(true);
      readyReceived = true;
      interrupted = false;
    });
    source.addEventListener("refresh", () => {
      if (events !== source) return;
      options.onLive();
      void refresh(true);
    });
    const retry = () => {
      if (events !== source) return;
      interrupted = true;
      options.onRetry();
    };
    source.addEventListener("sync-error", retry);
    source.onerror = retry;
    reconcile = setInterval(() => void refresh(), 5 * 60_000);
  };
  const resume = () => {
    if (!visible()) { stop(); return; }
    start();
    void refresh();
  };
  const pagehide = () => stop();
  const offline = () => { stop(); options.onRetry(); };
  document.addEventListener("visibilitychange", resume);
  window.addEventListener("focus", resume);
  window.addEventListener("online", resume);
  window.addEventListener("offline", offline);
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("pageshow", resume);
  start();
  return () => {
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", resume);
    window.removeEventListener("focus", resume);
    window.removeEventListener("online", resume);
    window.removeEventListener("offline", offline);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("pageshow", resume);
  };
}
