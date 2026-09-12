import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startDashboardLiveSync } from "./dashboard-live-sync";

class FakeSource extends EventTarget {
  static instances: FakeSource[] = [];
  closed = false;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) { super(); FakeSource.instances.push(this); }
  close() { this.closed = true; }
  emit(type: string) { this.dispatchEvent(new Event(type)); }
}
let doc: EventTarget & { visibilityState: string };
let win: EventTarget;
let net: { onLine: boolean };
let cleanup: (() => void) | undefined;
const refresh = vi.fn(async () => {});
const onLive = vi.fn();
const onRetry = vi.fn();
const start = () => { cleanup = startDashboardLiveSync({ refresh, onLive, onRetry }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-12T10:00:00Z")); vi.clearAllMocks();
  FakeSource.instances = [];
  doc = Object.assign(new EventTarget(), { visibilityState: "visible" }); win = new EventTarget(); net = { onLine: true };
  vi.stubGlobal("document", doc); vi.stubGlobal("window", win); vi.stubGlobal("navigator", net); vi.stubGlobal("EventSource", FakeSource);
});
afterEach(() => { cleanup?.(); cleanup = undefined; vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("shared dashboard background sync", () => {
  it("opens one same-origin stream and performs only 12 fallback refreshes per visible hour", async () => {
    start(); expect(FakeSource.instances[0].url).toBe("/api/threadwise/events");
    FakeSource.instances[0].emit("ready");
    expect(onLive).toHaveBeenCalledTimes(1); expect(refresh).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(refresh).toHaveBeenCalledTimes(12);
    expect(FakeSource.instances).toHaveLength(1);
  });
  it("does zero recurring work while hidden and immediately refreshes once on return", async () => {
    start(); doc.visibilityState = "hidden"; doc.dispatchEvent(new Event("visibilitychange"));
    expect(FakeSource.instances[0].closed).toBe(true);
    await vi.advanceTimersByTimeAsync(4 * 60 * 60_000);
    expect(refresh).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    doc.visibilityState = "visible"; doc.dispatchEvent(new Event("visibilitychange")); win.dispatchEvent(new Event("focus"));
    await Promise.resolve(); expect(refresh).toHaveBeenCalledTimes(1); expect(FakeSource.instances).toHaveLength(2);
  });
  it("does not open an initially hidden/offline tab", () => {
    doc.visibilityState = "hidden"; start(); expect(FakeSource.instances).toHaveLength(0);
    doc.visibilityState = "visible"; net.onLine = false; doc.dispatchEvent(new Event("visibilitychange"));
    expect(FakeSource.instances).toHaveLength(0);
    net.onLine = true; win.dispatchEvent(new Event("online"));
    expect(FakeSource.instances).toHaveLength(1); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("disconnects offline and reconciles after network recovery", async () => {
    start(); net.onLine = false; win.dispatchEvent(new Event("offline"));
    expect(FakeSource.instances[0].closed).toBe(true); expect(onRetry).toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(60 * 60_000); expect(refresh).not.toHaveBeenCalled();
    net.onLine = true; win.dispatchEvent(new Event("online"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("refreshes on SSE change and on a new ready baseline after a broken stream", async () => {
    start(); const source = FakeSource.instances[0]; source.emit("ready"); source.emit("refresh");
    await vi.advanceTimersByTimeAsync(1_100); expect(refresh).toHaveBeenCalledTimes(1);
    source.onerror?.(); expect(onRetry).toHaveBeenCalled(); source.emit("ready");
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("cleans up timers/listeners and ignores events from obsolete streams", async () => {
    start(); const old = FakeSource.instances[0]; cleanup?.(); cleanup = undefined;
    old.emit("refresh"); old.emit("ready"); win.dispatchEvent(new Event("focus"));
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(refresh).not.toHaveBeenCalled(); expect(onLive).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
  });
  it("closes on pagehide and resumes from the browser back-forward cache", async () => {
    start(); win.dispatchEvent(new Event("pagehide")); expect(FakeSource.instances[0].closed).toBe(true);
    await vi.advanceTimersByTimeAsync(5_000); win.dispatchEvent(new Event("pageshow"));
    expect(FakeSource.instances).toHaveLength(2); expect(refresh).toHaveBeenCalledTimes(1);
  });
  it("keeps one trailing content refresh if a change arrives during an older fetch", async () => {
    let release!: () => void;
    refresh.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    start(); const source = FakeSource.instances[0];
    source.emit("refresh"); source.emit("refresh"); source.emit("refresh");
    expect(refresh).toHaveBeenCalledTimes(1);
    release(); await Promise.resolve(); await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
