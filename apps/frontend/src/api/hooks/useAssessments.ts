import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createUserAssessment,
  listUserAssessments,
  updateUserAssessment
} from '../client';
import { queryKeys } from '../queryKeys';
import type {
  AssessmentCreateRequest,
  AssessmentCreateResponse,
  AssessmentListResponse,
  AssessmentUpdateRequest,
  ListUserAssessmentsParams
} from '../types';
import { normalizeApiError, type NormalizedApiError } from '../errors';

const assessmentRetrySchedule = [60_000, 120_000, 240_000];

export const useAssessmentsQuery = (userId: string, params: ListUserAssessmentsParams) =>
  useInfiniteQuery<AssessmentListResponse, NormalizedApiError>({
    queryKey: queryKeys.assessments(userId, params.status, params.limit),
    initialPageParam: params.cursor ?? null,
    queryFn: async ({ pageParam }) => {
      try {
        return await listUserAssessments(userId, {
          ...params,
          cursor: typeof pageParam === 'string' ? pageParam : undefined
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    retryDelay: (attempt) => assessmentRetrySchedule[attempt - 1] ?? assessmentRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:assessments' }
  });

export const useCreateAssessmentMutation = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation<AssessmentCreateResponse, NormalizedApiError, AssessmentCreateRequest>({
    mutationFn: async (payload) => {
      try {
        return await createUserAssessment(userId, payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'users' });
    }
  });
};

export const useUpdateAssessmentMutation = (userId: string, assessmentId: string) => {
  const queryClient = useQueryClient();
  return useMutation<AssessmentCreateResponse, NormalizedApiError, AssessmentUpdateRequest>({
    mutationFn: async (payload) => {
      try {
        return await updateUserAssessment(userId, assessmentId, payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'users' });
    }
  });
};
