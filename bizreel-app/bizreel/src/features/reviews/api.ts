import { api } from '@/lib/api';
import type { CreateReviewInput, Review } from './types';

export async function getListingReviews(listingId: string): Promise<Review[]> {
  const { data } = await api.get(`/reviews/listing/${listingId}`);
  const items = data.data || data.reviews || data.items || data || [];
  return Array.isArray(items) ? items : [];
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const listingId = (input as any).targetListingId || (input as any).listingId || input.listing_id || (input as any).listing;
  const userId = (input as any).targetUserId || (input as any).userId || (input as any).vendorId;
  const payload: any = {
    rating: input.rating,
    comment: input.comment,
  };
  if (listingId) {
    payload.targetListingId = listingId;
    payload.listingId = listingId;
    payload.listing_id = listingId;
    payload.listing = listingId;
  }
  if (userId) {
    payload.targetUserId = userId;
    payload.userId = userId;
  }
  const { data } = await api.post('/reviews', payload);
  return data.data || data;
}
