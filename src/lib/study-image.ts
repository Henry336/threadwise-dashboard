export class StudyImageLoadError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
    this.name = "StudyImageLoadError";
  }
}

export async function loadStudyImage(
  resourceId: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<Blob> {
  let response: Response;
  try {
    response = await fetcher(`/api/threadwise/study/resources/${encodeURIComponent(resourceId)}/content`, {
      cache: "no-store",
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new StudyImageLoadError("The image could not be loaded. Check the connection and try again.", true);
  }

  if (!response.ok) {
    const authorizationFailure = response.status === 401 || response.status === 403;
    const permanentlyMissing = response.status === 404 || response.status === 410;
    const fallback = authorizationFailure
      ? "Your dashboard session can no longer load this image. Sign in again."
      : permanentlyMissing
        ? "The original Telegram image is no longer available."
        : "The image could not be loaded just now.";
    let message = fallback;
    try {
      const body = await response.json() as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // The proxy may return an empty upstream response. The friendly fallback is enough.
    }
    throw new StudyImageLoadError(message, !authorizationFailure && !permanentlyMissing);
  }

  const bytes = await response.arrayBuffer();
  const declaredType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
  const detectedType = detectImageMime(new Uint8Array(bytes));
  const contentType = declaredType.startsWith("image/") ? declaredType : detectedType;
  if (!contentType) {
    throw new StudyImageLoadError("Telegram returned a file that is not an image.", false);
  }
  return new Blob([bytes], { type: contentType });
}

export function detectImageMime(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) === "GIF87a") return "image/gif";
  if (bytes.length >= 6 && String.fromCharCode(...bytes.slice(0, 6)) === "GIF89a") return "image/gif";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) return "image/bmp";
  return undefined;
}
