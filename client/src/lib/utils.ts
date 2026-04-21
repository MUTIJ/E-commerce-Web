import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize an image URL returned from the API before passing it to an
 * `<img>` element.  The backend stores paths such as `/objects/…` but
 * occasionally older data may drop the leading slash; additionally, the
 * upload helper can sometimes return a full signed URL which may have
 * already expired.  This helper simply ensures the browser requests our
 * own server when possible.
 */
export function getImageSrc(raw?: string | null) {
  if (!raw) return "";
  // absolute URLs are returned as-is so attachments from third-party
  // sources still work
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  // leading-slash paths already point at our server
  if (raw.startsWith("/")) {
    return raw;
  }
  // otherwise prepend a slash to avoid the browser resolving the path
  // relative to the current location
  return `/${raw}`;
}
