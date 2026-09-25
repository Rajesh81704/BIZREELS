import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createRequirement,
  fetchMyRequirements,
  submitQuoteApi,
  type CreateRequirementPayload,
  type SubmitQuotePayload,
} from './api';

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRequirementPayload) => createRequirement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
    },
  });
}

export function useMyRequirements() {
  return useQuery({
    queryKey: ['requirements', 'me'],
    queryFn: () => fetchMyRequirements(),
  });
}

export function useSubmitQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitQuotePayload) => submitQuoteApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requirements'] });
      queryClient.invalidateQueries({ queryKey: ['inquiries'] });
    },
  });
}
