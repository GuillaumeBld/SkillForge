import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUser, getResumeStatus, uploadResume } from '../client';
import { queryKeys } from '../queryKeys';
import type {
  ResumeStatusResponse,
  ResumeUploadResponse,
  UserCreateRequest,
  UserCreateResponse
} from '../types';
import { normalizeApiError, type NormalizedApiError } from '../errors';

const onboardingRetrySchedule = [60_000, 300_000, 900_000];

export const useResumeStatusQuery = (
  userId: string,
  resumeId: string,
  includeVectors = false,
  enabled = true
) =>
  useQuery<ResumeStatusResponse, NormalizedApiError>({
    queryKey: queryKeys.resume(userId, resumeId),
    queryFn: async () => {
      try {
        return await getResumeStatus(userId, resumeId, includeVectors);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    enabled,
    retryDelay: (attempt) => onboardingRetrySchedule[attempt - 1] ?? onboardingRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:onboarding' }
  });

export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();
  return useMutation<UserCreateResponse, NormalizedApiError, { payload: UserCreateRequest; inviteCode?: string }>(
    {
      mutationFn: async ({ payload, inviteCode }) => {
        try {
          return await createUser(payload, inviteCode);
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.onboarding(data.user_id) });
      }
    }
  );
};

export const useUploadResumeMutation = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation<ResumeUploadResponse, NormalizedApiError, FormData>({
    mutationFn: async (formData) => {
      try {
        return await uploadResume(userId, formData);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resume(userId, data.resume_id) });
    }
  });
};
