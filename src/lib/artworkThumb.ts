// src/lib/artworkThumb.ts
export function isPdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return /\.pdf($|\?)/i.test(u.pathname);
  } catch {
    return /\.pdf($|\?)/i.test(url);
  }
}

/**
 * If the original is a PDF, we try common sidecar names:
 *   file.pdf  -> file.jpg
 *   file.pdf  -> file.png
 *   file.pdf  -> file-thumb.jpg
 *   file.pdf  -> file.preview.jpg
 *
 * If it's already an image, we just return [original].
 */
export function thumbCandidatesFor(url: string): string[] {
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (!/\.pdf($|\?)/i.test(path)) return [url]; // already an image

    const base = path.replace(/\.pdf($|\?)/i, "");
    const baseHref = u.origin + base;

    return [
      `${baseHref}.jpg`,
      `${baseHref}.png`,
      `${baseHref}-thumb.jpg`,
      `${baseHref}.preview.jpg`,
    ];
  } catch {
    // if URL constructor fails, do basic string replace
    if (!/\.pdf($|\?)/i.test(url)) return [url];
    const noPdf = url.replace(/\.pdf($|\?)/i, "");
    return [
      `${noPdf}.jpg`,
      `${noPdf}.png`,
      `${noPdf}-thumb.jpg`,
      `${noPdf}.preview.jpg`,
    ];
  }
}
