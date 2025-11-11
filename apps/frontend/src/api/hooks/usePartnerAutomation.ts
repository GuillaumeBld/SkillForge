import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  assignBatchAssessment,
  bulkImportUsers,
  importCandidates,
  listCandidateMatches,
  partnerCreateAssessment,
  quickVerifyAssessment,
  recordPlacement,
  registerCandidate,
  syncJobs,
  updatePlacementOutcome
} from '../client';
import { queryKeys } from '../queryKeys';
import type {
  BatchAssessmentRequest,
  BatchAssessmentResponse,
  CandidateCreateRequest,
  CandidateCreateResponse,
  CandidateImportRequest,
  CandidateImportResponse,
  CandidateMatchListResponse,
  JobSyncRequest,
  JobSyncResponse,
  ListCandidateMatchesParams,
  PartnerAssessmentCreateRequest,
  PartnerAssessmentCreateResponse,
  PlacementOutcomeRequest,
  PlacementOutcomeResponse,
  PlacementRecordRequest,
  PlacementRecordResponse,
  QuickVerifyAssessmentRequest,
  QuickVerifyAssessmentResponse,
  UserBulkImportRequest,
  UserBulkImportResponse
} from '../types';
import { normalizeApiError, type NormalizedApiError } from '../errors';

const partnerRetrySchedule = [30_000, 120_000, 300_000];

export const useCandidateMatchesQuery = (
  candidateId: string,
  params: ListCandidateMatchesParams
) =>
  useInfiniteQuery<CandidateMatchListResponse, NormalizedApiError>({
    queryKey: queryKeys.candidateMatches(candidateId, params.type),
    initialPageParam: params.cursor ?? null,
    queryFn: async ({ pageParam }) => {
      try {
        return await listCandidateMatches(candidateId, {
          ...params,
          cursor: typeof pageParam === 'string' ? pageParam : undefined
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    retryDelay: (attempt) => partnerRetrySchedule[attempt - 1] ?? partnerRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:partner-matching' }
  });

export const useCandidateImportMutation = () =>
  useMutation<CandidateImportResponse, NormalizedApiError, CandidateImportRequest>({
    mutationFn: async (payload) => {
      try {
        return await importCandidates(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const useBulkUserImportMutation = () =>
  useMutation<UserBulkImportResponse, NormalizedApiError, UserBulkImportRequest>({
    mutationFn: async (payload) => {
      try {
        return await bulkImportUsers(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const useRegisterCandidateMutation = () =>
  useMutation<CandidateCreateResponse, NormalizedApiError, CandidateCreateRequest>({
    mutationFn: async (payload) => {
      try {
        return await registerCandidate(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const usePartnerAssessmentMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<PartnerAssessmentCreateResponse, NormalizedApiError, PartnerAssessmentCreateRequest>({
    mutationFn: async (payload) => {
      try {
        return await partnerCreateAssessment(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.candidateMatches(variables.candidate_id, 'jobs')
      });
    }
  });
};

export const useBatchAssessmentMutation = () =>
  useMutation<BatchAssessmentResponse, NormalizedApiError, BatchAssessmentRequest>({
    mutationFn: async (payload) => {
      try {
        return await assignBatchAssessment(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const useQuickVerifyMutation = () =>
  useMutation<QuickVerifyAssessmentResponse, NormalizedApiError, QuickVerifyAssessmentRequest>({
    mutationFn: async (payload) => {
      try {
        return await quickVerifyAssessment(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const useJobSyncMutation = () =>
  useMutation<JobSyncResponse, NormalizedApiError, JobSyncRequest>({
    mutationFn: async (payload) => {
      try {
        return await syncJobs(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const useRecordPlacementMutation = () =>
  useMutation<PlacementRecordResponse, NormalizedApiError, PlacementRecordRequest>({
    mutationFn: async (payload) => {
      try {
        return await recordPlacement(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });

export const usePlacementOutcomeMutation = () =>
  useMutation<PlacementOutcomeResponse, NormalizedApiError, PlacementOutcomeRequest>({
    mutationFn: async (payload) => {
      try {
        return await updatePlacementOutcome(payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    }
  });
