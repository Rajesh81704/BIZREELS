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
  title: string;
  description: string;
  category: string;
  budget?: number;
  quantity?: number;
  city?: string;
  status: string;
  createdAt: string;
}

export async function createRequirement(payload: CreateRequirementPayload): Promise<Requirement> {
  const response = await api.post<{ success: boolean; data: Requirement }>('/requirements', payload);
  return response.data.data;
}

export async function fetchMyRequirements(): Promise<Requirement[]> {
  const response = await api.get<{ success: boolean; data: Requirement[] }>('/requirements');
  return response.data.data || [];
}
