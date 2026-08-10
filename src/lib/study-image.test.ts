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
});
