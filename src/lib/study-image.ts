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

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) {
    throw new StudyImageLoadError("Telegram returned a file that is not an image.", false);
  }
  return response.blob();
}
