import { api } from '@/lib/api';

export interface CreateRequirementPayload {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  type?: 'product' | 'service';
  requirementType?: 'product' | 'service';
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  quantity?: number;
  is_negotiable?: boolean;
  urgency?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  address?: string;
  targetDistance?: number;
  detailedSpecifications?: string;
  expectedDeliveryDate?: string;
  expectedDeliveryTime?: string;
  productCondition?: string;
  customProductCondition?: string;
  serviceModel?: string;
  customServiceModel?: string;
  customCategory?: string;
  customSubcategory?: string;
  otherConditions?: string;
  photos?: string[];
  video?: string;
  location?: {
    city?: string;
    area?: string;
    district?: string;
    state?: string;
    pincode?: string;
  };
}

export interface Requirement {
  _id: string;
  id?: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  type?: 'product' | 'service';
  requirementType?: 'product' | 'service';
  budget?: number;
  budget_min?: number;
  budget_max?: number;
  quantity?: number;
  is_negotiable?: boolean;
  urgency?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  address?: string;
  detailedSpecifications?: string;
  expectedDeliveryDate?: string;
  expectedDeliveryTime?: string;
  photos?: string[];
  video?: string;
  status: string;
  createdAt: string;
  customer?: {
    _id?: string;
    name?: string;
    avatarUrl?: string;
    phone?: string;
  };
  hasResponded?: boolean;
  myQuote?: {
    _id?: string;
    price?: number;
    message?: string;
    status?: string;
  };
}

export interface SubmitQuotePayload {
  requirementId: string;
  price: number;
  message?: string;
  deliveryTimeDays?: number;
}

export async function createRequirement(payload: CreateRequirementPayload): Promise<Requirement> {
  const response = await api.post<{ success: boolean; data: Requirement }>('/requirements', payload);
  return response.data.data;
}

export async function fetchMyRequirements(): Promise<Requirement[]> {
  const response = await api.get('/requirements');
  const data = response.data?.data || response.data;
  const list = Array.isArray(data?.requirements)
    ? data.requirements
    : Array.isArray(data)
    ? data
    : [];
  return list;
}

export async function submitQuoteApi(payload: SubmitQuotePayload): Promise<any> {
  const response = await api.post('/requirements/quotes', {
    requirementId: payload.requirementId,
    requirement: payload.requirementId,
    price: payload.price,
    amount: payload.price,
    message: payload.message || '',
    notes: payload.message || '',
    deliveryTimeDays: payload.deliveryTimeDays || 1,
  });
  return response.data;
}
