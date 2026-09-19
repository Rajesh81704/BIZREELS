import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/context';
import {
  createVendorListing,
  deleteVendorListing,
  duplicateListing,
  fetchListingAnalytics,
  fetchListingDetails,
  fetchVendorListings,
  updateListingStock,
  updateVendorListing,
} from './api';

export function useVendorListings() {
  const { user } = useAuth();
  const vendorId = (user as any)?._id || (user as any)?.id;

  return useQuery({
    queryKey: ['vendor', 'listings', vendorId],
    queryFn: () => fetchVendorListings(vendorId),
  });
}

export function useListingDetails(id?: string) {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => (id ? fetchListingDetails(id) : null),
    enabled: Boolean(id),
  });
}

export function useListingAnalytics(id?: string) {
  return useQuery({
    queryKey: ['listing', id, 'analytics'],
    queryFn: () => (id ? fetchListingAnalytics(id) : null),
    enabled: Boolean(id),
  });
}

export function useCreateVendorListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVendorListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useUpdateVendorListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateVendorListing,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
      }
    },
  });
}

export function useUpdateListingStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => updateListingStock(id, stock),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', variables.id] });
    },
  });
}

export function useDuplicateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

export function useDeleteVendorListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVendorListing,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
}

