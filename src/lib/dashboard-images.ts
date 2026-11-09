/** Image URL helper shared by the image grids and lightboxes. */
import type { DashboardImage } from "./types";

/** Bundled pictures the credential-free demo shows in place of real Telegram images. */
export const DEMO_IMAGES = ["garden-light.svg", "launch-board.svg", "morning-cafe.svg", "receipt.svg", "city-rain.svg", "book-stack.svg"];

/** Where the browser loads an image from: a bundled demo picture, or the authenticated same-origin proxy. */
export function imageSrc(image: DashboardImage, isDemo: boolean, index = 0): string {
  return isDemo
    ? `/demo/${image.fileName && DEMO_IMAGES.includes(image.fileName) ? image.fileName : DEMO_IMAGES[index % DEMO_IMAGES.length]}`
    : `/api/threadwise/images/${encodeURIComponent(image.id)}/content`;
}
