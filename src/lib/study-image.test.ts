import { describe, expect, it, vi } from "vitest";
import { loadStudyImage, StudyImageLoadError } from "./study-image";

describe("Study image loader", () => {
  it("returns proxied image data without navigating to the API route", async () => {
    const fetcher = vi.fn(async () => new Response(new Blob(["image"], { type: "image/png" }), {
      status: 200,
      headers: { "content-type": "image/png" },
    })) as unknown as typeof fetch;
    const blob = await loadStudyImage("resource one", undefined, fetcher);
    expect(blob.type).toBe("image/png");
    expect(fetcher).toHaveBeenCalledWith("/api/threadwise/study/resources/resource%20one/content", expect.objectContaining({ cache: "no-store" }));
  });

  it("distinguishes a missing Telegram original from a retryable failure", async () => {
    const missing = vi.fn(async () => Response.json({ message: "Original removed." }, { status: 404 })) as unknown as typeof fetch;
    await expect(loadStudyImage("missing", undefined, missing)).rejects.toMatchObject({ retryable: false, message: "Original removed." } satisfies Partial<StudyImageLoadError>);

    const temporary = vi.fn(async () => Response.json({ message: "Try again." }, { status: 503 })) as unknown as typeof fetch;
    await expect(loadStudyImage("temporary", undefined, temporary)).rejects.toMatchObject({ retryable: true, message: "Try again." } satisfies Partial<StudyImageLoadError>);

    const unauthorized = vi.fn(async () => new Response(null, { status: 401 })) as unknown as typeof fetch;
    await expect(loadStudyImage("private", undefined, unauthorized)).rejects.toMatchObject({
      retryable: false,
      message: "Your dashboard session can no longer load this image. Sign in again.",
    } satisfies Partial<StudyImageLoadError>);
  });

  it("recovers historical images served as generic binary data", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const fetcher = vi.fn(async () => new Response(png, {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    })) as unknown as typeof fetch;
    const blob = await loadStudyImage("historical", undefined, fetcher);
    expect(blob.type).toBe("image/png");
  });

  it("rejects generic binary data that is not an image", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), {
      status: 200,
      headers: { "content-type": "application/octet-stream" },
    })) as unknown as typeof fetch;
    await expect(loadStudyImage("not-image", undefined, fetcher)).rejects.toMatchObject({ retryable: false });
  });
});
