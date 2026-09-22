import { api } from '@/lib/api';
import type { CreateReviewInput, Review } from './types';

export async function getListingReviews(listingId: string): Promise<Review[]> {
  const { data } = await api.get(`/reviews/listing/${listingId}`);
  const items = data.data || data.reviews || data.items || data || [];
  const list = Array.isArray(items) ? items : [];
  return list.map((item: any) => {
    const name = item.author?.name || item.user?.name || item.userName || item.user_name || item.customer || item.name || 'Customer';
    const userObj = item.user && typeof item.user === 'object' ? item.user : (item.author && typeof item.author === 'object' ? item.author : { name });
    const authorObj = item.author && typeof item.author === 'object' ? item.author : userObj;
    return {
      ...item,
      user: { ...userObj, name: userObj.name || name },
      author: { ...authorObj, name: authorObj.name || name },
    };
  });
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
