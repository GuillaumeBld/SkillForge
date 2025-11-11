import { type InfiniteData, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listNotifications, updateNotification, upsertNotificationPreferences } from '../client';
import { queryKeys } from '../queryKeys';
import type {
  ListNotificationsParams,
  NotificationListResponse,
  NotificationPreferencesRequest,
  NotificationPreferencesResponse,
  NotificationResource,
  NotificationUpdateRequest
} from '../types';
import { normalizeApiError, type NormalizedApiError } from '../errors';

const notificationRetrySchedule = [300_000, 900_000, 1_800_000];

type NotificationsPages = InfiniteData<NotificationListResponse>;
type UpdateNotificationContext = { previous?: NotificationsPages };

export const useNotificationsQuery = (userId: string, params: ListNotificationsParams) =>
  useInfiniteQuery<NotificationListResponse, NormalizedApiError>({
    queryKey: queryKeys.notifications(userId, params),
    initialPageParam: params.cursor ?? null,
    queryFn: async ({ pageParam }) => {
      try {
        return await listNotifications(userId, {
          ...params,
          cursor: typeof pageParam === 'string' ? pageParam : undefined
        });
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    retryDelay: (attempt) => notificationRetrySchedule[attempt - 1] ?? notificationRetrySchedule.at(-1)!,
    meta: { failureBackoff: 'sequence:notifications' }
  });

export const useUpdateNotificationMutation = (
  userId: string,
  params: ListNotificationsParams
) => {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.notifications(userId, params);

  return useMutation<
    NotificationResource,
    NormalizedApiError,
    { notificationId: string; payload: NotificationUpdateRequest },
    UpdateNotificationContext
  >(
    {
      mutationFn: async ({ notificationId, payload }) => {
        try {
          return await updateNotification(userId, notificationId, payload);
        } catch (error) {
          throw normalizeApiError(error);
        }
      },
      onMutate: async ({ notificationId, payload }) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData<NotificationsPages>(queryKey);

        if (previous) {
          const next: NotificationsPages = {
            pageParams: previous.pageParams,
            pages: previous.pages.map((page) => ({
              ...page,
              notifications: page.notifications.map((notification) =>
                notification.id === notificationId ? { ...notification, ...payload } : notification
              )
            }))
          };
          queryClient.setQueryData(queryKey, next);
        }

        return { previous };
      },
      onError: (_error, _variables, context) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      }
    }
  );
};

export const useUpsertNotificationPreferencesMutation = (userId: string) => {
  const queryClient = useQueryClient();
  return useMutation<NotificationPreferencesResponse, NormalizedApiError, NotificationPreferencesRequest>({
    mutationFn: async (payload) => {
      try {
        return await upsertNotificationPreferences(userId, payload);
      } catch (error) {
        throw normalizeApiError(error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications(userId) });
    }
  });
};
