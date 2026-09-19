import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVendorOffer,
  deleteVendorOffer,
  duplicateVendorOffer,
  fetchVendorOfferDetails,
  fetchVendorOffers,
  testValidateCoupon,
  toggleVendorOfferStatus,
  updateVendorOffer,
} from './api';

export function useVendorOffers() {
  return useQuery({
    queryKey: ['vendor', 'offers'],
    queryFn: fetchVendorOffers,
  });
}

export function useVendorOfferDetails(id?: string) {
  return useQuery({
    queryKey: ['vendor', 'offer', id],
    queryFn: () => (id ? fetchVendorOfferDetails(id) : null),
    enabled: Boolean(id),
  });
}

export function useTestValidateCoupon() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => testValidateCoupon(id, payload),
  });
}

export function useCreateVendorOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createVendorOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'offers'] });
    },
  });
}

export function useUpdateVendorOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateVendorOffer,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'offers'] });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['vendor', 'offer', variables.id] });
      }
    },
  });
}

export function useToggleVendorOfferStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleVendorOfferStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'offers'] });
    },
  });
}

export function useDuplicateVendorOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: duplicateVendorOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'offers'] });
    },
  });
}

export function useDeleteVendorOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteVendorOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', 'offers'] });
    },
  });
}

