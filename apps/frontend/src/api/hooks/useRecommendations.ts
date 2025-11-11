import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getUserDashboard, listUserMatches } from '../client';
import { queryKeys } from '../queryKeys';
import type {
  DashboardParams,
  DashboardResponse,
  ListMatchesParams,
  MatchListResponse
} from '../types';
import { normalizeApiError, type NormalizedApiError } from '../errors';

const matchingRetrySchedule = [60_000, 120_000, 240_000];

export const useMatchRecommendations = (userId: string, params: ListMatchesParams) =>
  useInfiniteQuery<MatchListResponse, NormalizedApiError>({
    queryKey: queryKeys.matches(userId, params.type),
    initialPageParam: params.cursor ?? null,
    queryFn: async ({ pageParam }) => {
      try {
        return await listUserMatches(userId, {
          ...params,
          cursor: typeof pageParam === 'string' ? pageParam : undefined
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    retryDelay: (attempt) => matchingRetrySchedule[attempt - 1] ?? matchingRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:matching' }
  });

export const useDashboardQuery = (userId: string, params: DashboardParams) =>
  useQuery<DashboardResponse, NormalizedApiError>({
    queryKey: queryKeys.dashboard(userId, params.sections),
    queryFn: async () => {
      try {
        return await getUserDashboard(userId, params);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    retryDelay: (attempt) => matchingRetrySchedule[attempt - 1] ?? matchingRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:dashboard' }
  });
