/** Types for /categories and /listings endpoints. */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  /** Emoji or URL — null when not set */
  icon_url: string | null;
  category_type: 'product' | 'service';
  /** null = top-level (parent) category */
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface CategoriesResponse {
  items: Category[];
}

// ---------------------------------------------------------------------------
// Listings
// ---------------------------------------------------------------------------

export interface ListingVendor {
  _id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Listing {
  _id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  type: 'product' | 'service';
  price: number;
  salePrice?: number;
  discount: number;
  condition: string;
  images: string[];
  rating: number;
  totalReviews: number;
  isBoosted: boolean;
  status: string;
  views: number;
  stock: number;
  vendor: ListingVendor;
  city?: string;
  createdAt: string;
}

export interface ListingsMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListingsResponse {
  success: boolean;
  message: string;
  data: Listing[];
  meta: ListingsMeta;
}

export interface ListingsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  subcategory?: string;
  type?: 'product' | 'service' | string;
  minPrice?: number;
  maxPrice?: number;
  lat?: number;
  lng?: number;
  distance?: number | string;
  sort?: string;
  vendor?: string;
  condition?: string;
  sellerType?: string;
  minRating?: number | string;
  has_offer?: boolean | string;
  shopName?: string;
  openNow?: boolean | string;
  deliveryType?: string;
}
