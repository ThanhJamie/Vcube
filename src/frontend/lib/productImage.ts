export const FABRICATED_PLACEHOLDER_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1581092335397-9583fe92d232',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758',
];

export function isFabricatedImage(url?: string | null): boolean {
  const value = url?.trim();
  if (!value) return true;
  const lower = value.toLowerCase();
  if (FABRICATED_PLACEHOLDER_IMAGE_URLS.some((known) => lower.includes(known.toLowerCase()))) return true;
  if (lower.includes('images.unsplash.com') || lower.includes('picsum.photos')) return true;
  return false;
}

export function realProductImageUrl(
  images?: string[] | null,
  thumbnailUrl?: string | null,
): string | undefined {
  const first = (thumbnailUrl?.trim() || images?.[0]?.trim()) ?? '';
  if (!first) return undefined;
  return isFabricatedImage(first) ? undefined : first;
}
