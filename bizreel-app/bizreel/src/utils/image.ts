/**
 * Utility helper to safely extract and resolve image URLs for products, services, and vendors.
 * Handles array of strings, objects ({ url, uri, path }), relative uploads (/uploads/...), and fallbacks.
 */

const BACKEND_HOST = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://api.onlinefiledrop.com';

export function resolveImageUrl(urlCandidate: any): string | null {
  if (!urlCandidate) return null;

  let rawUrl: string | null = null;

  if (typeof urlCandidate === 'string') {
    rawUrl = urlCandidate;
  } else if (typeof urlCandidate === 'object') {
    rawUrl =
      urlCandidate.url ||
      urlCandidate.uri ||
      urlCandidate.path ||
      urlCandidate.src ||
      urlCandidate.imageUrl ||
      null;
  }

  if (!rawUrl || typeof rawUrl !== 'string') return null;

  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // If it's a relative path like /uploads/img.jpg, prepend the backend host
  if (trimmed.startsWith('/')) {
    return `${BACKEND_HOST}${trimmed}`;
  }

  return trimmed;
}

/**
 * Extracts the primary image URL from a product or service listing item.
 */
export function getListingImage(item: any): string | null {
  if (!item) return null;
  if (typeof item === 'string') return resolveImageUrl(item);

  // 1. Direct single image properties
  const directImage =
    resolveImageUrl(item.coverImage) ||
    resolveImageUrl(item.cover_image) ||
    resolveImageUrl(item.coverPhoto) ||
    resolveImageUrl(item.cover_photo) ||
    resolveImageUrl(item.image) ||
    resolveImageUrl(item.imageUrl) ||
    resolveImageUrl(item.thumbnailUrl) ||
    resolveImageUrl(item.thumbnail) ||
    resolveImageUrl(item.serviceDetails?.coverImage) ||
    resolveImageUrl(item.serviceDetails?.cover_image) ||
    resolveImageUrl(item.serviceDetails?.coverPhoto);

  if (directImage) return directImage;

  // 2. Images array (strings or objects)
  if (Array.isArray(item.images) && item.images.length > 0) {
    for (const img of item.images) {
      const resolved = resolveImageUrl(img);
      if (resolved) return resolved;
    }
  }

  // 3. Media URLs / Gallery array
  if (Array.isArray(item.mediaUrls) && item.mediaUrls.length > 0) {
    for (const img of item.mediaUrls) {
      const resolved = resolveImageUrl(img);
      if (resolved) return resolved;
    }
  }

  if (Array.isArray(item.gallery) && item.gallery.length > 0) {
    for (const img of item.gallery) {
      const resolved = resolveImageUrl(img);
      if (resolved) return resolved;
    }
  }

  // 4. Service portfolio array
  if (
    item.serviceDetails?.portfolio &&
    Array.isArray(item.serviceDetails.portfolio) &&
    item.serviceDetails.portfolio.length > 0
  ) {
    for (const img of item.serviceDetails.portfolio) {
      const resolved = resolveImageUrl(img);
      if (resolved) return resolved;
    }
  }

  if (
    item.serviceDetails?.portfolioGallery &&
    Array.isArray(item.serviceDetails.portfolioGallery) &&
    item.serviceDetails.portfolioGallery.length > 0
  ) {
    for (const img of item.serviceDetails.portfolioGallery) {
      const resolved = resolveImageUrl(img);
      if (resolved) return resolved;
    }
  }

  // 5. Variant image
  if (Array.isArray(item.variants) && item.variants.length > 0) {
    for (const v of item.variants) {
      const resolved = resolveImageUrl(v.image || v.imageUrl);
      if (resolved) return resolved;
    }
  }

  return null;
}

/**
 * Extracts ALL unique valid image URLs from a product or service listing item.
 */
export function getAllListingImages(item: any): string[] {
  if (!item) return [];

  const list: string[] = [];

  const addCand = (cand: any) => {
    if (!cand) return;
    if (Array.isArray(cand)) {
      cand.forEach((c) => addCand(c));
      return;
    }
    const resolved = resolveImageUrl(cand);
    if (resolved && !list.includes(resolved)) {
      list.push(resolved);
    }
  };

  addCand(item.coverImage);
  addCand(item.cover_image);
  addCand(item.coverPhoto);
  addCand(item.cover_photo);
  addCand(item.serviceDetails?.coverImage);
  addCand(item.serviceDetails?.cover_image);
  addCand(item.serviceDetails?.coverPhoto);
  addCand(item.serviceDetails?.cover_photo);
  addCand(item.images);
  addCand(item.image);
  addCand(item.imageUrl);
  addCand(item.thumbnailUrl);
  addCand(item.thumbnail);
  addCand(item.gallery);
  addCand(item.media);
  addCand(item.mediaUrls);
  addCand(item.serviceDetails?.portfolioGallery);
  addCand(item.serviceDetails?.portfolio);
  addCand(item.serviceDetails?.gallery);

  return list;
}
