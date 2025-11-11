import axios, { type AxiosError } from 'axios';
import type {
  ApiErrorPayload,
  AssessmentCreateRequest,
  AssessmentCreateResponse,
  AssessmentListResponse,
  AssessmentUpdateRequest,
  BatchAssessmentRequest,
  BatchAssessmentResponse,
  CandidateCreateRequest,
  CandidateCreateResponse,
  CandidateImportRequest,
  CandidateImportResponse,
  CandidateMatchListResponse,
  DashboardParams,
  DashboardResponse,
  HealthResponse,
  JobSyncRequest,
  JobSyncResponse,
  ListCandidateMatchesParams,
  ListMatchesParams,
  ListNotificationsParams,
  ListUserAssessmentsParams,
  MatchListResponse,
  NotificationListResponse,
  NotificationPreferencesRequest,
  NotificationPreferencesResponse,
  NotificationUpdateRequest,
  PartnerAssessmentCreateRequest,
  PartnerAssessmentCreateResponse,
  PlacementOutcomeRequest,
  PlacementOutcomeResponse,
  PlacementRecordRequest,
  PlacementRecordResponse,
  QuickVerifyAssessmentRequest,
  QuickVerifyAssessmentResponse,
  ResumeStatusResponse,
  ResumeUploadResponse,
  UserBulkImportRequest,
  UserBulkImportResponse,
  UserCreateRequest,
  UserCreateResponse
} from './types';

export type ApiClientError = AxiosError<ApiErrorPayload>;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000',
  timeout: 15000
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

export const isApiClientError = (error: unknown): error is ApiClientError => {
  return axios.isAxiosError<ApiErrorPayload>(error);
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/api/v1/health');
  return response.data;
}

export async function createUser(
  payload: UserCreateRequest,
  inviteCode?: string
): Promise<UserCreateResponse> {
  const response = await api.post<UserCreateResponse>('/api/v1/users', payload, {
    params: inviteCode ? { invite_code: inviteCode } : undefined
  });
  return response.data;
}

export async function uploadResume(
  userId: string,
  formData: FormData
): Promise<ResumeUploadResponse> {
  const response = await api.post<ResumeUploadResponse>(`/api/v1/users/${userId}/resumes`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
}

export async function getResumeStatus(
  userId: string,
  resumeId: string,
  includeVectors = false
): Promise<ResumeStatusResponse> {
  const response = await api.get<ResumeStatusResponse>(
    `/api/v1/users/${userId}/resumes/${resumeId}`,
    { params: includeVectors ? { include_vectors: true } : undefined }
  );
  return response.data;
}

export async function listUserAssessments(
  userId: string,
  params: ListUserAssessmentsParams
): Promise<AssessmentListResponse> {
  const response = await api.get<AssessmentListResponse>(
    `/api/v1/users/${userId}/assessments`,
    { params: { ...params } }
  );
  return response.data;
}

export async function createUserAssessment(
  userId: string,
  payload: AssessmentCreateRequest
): Promise<AssessmentCreateResponse> {
  const response = await api.post<AssessmentCreateResponse>(
    `/api/v1/users/${userId}/assessments`,
    payload
  );
  return response.data;
}

export async function updateUserAssessment(
  userId: string,
  assessmentId: string,
  payload: AssessmentUpdateRequest
): Promise<AssessmentCreateResponse> {
  const response = await api.patch<AssessmentCreateResponse>(
    `/api/v1/users/${userId}/assessments/${assessmentId}`,
    payload
  );
  return response.data;
}

export async function listUserMatches(
  userId: string,
  params: ListMatchesParams
): Promise<MatchListResponse> {
  const response = await api.get<MatchListResponse>(`/api/v1/users/${userId}/matches`, {
    params: {
      type: params.type,
      cursor: params.cursor,
      limit: params.limit,
      include_jaat_debug: params.includeJaatDebug
    }
  });
  return response.data;
}

export async function getUserDashboard(
  userId: string,
  params: DashboardParams
): Promise<DashboardResponse> {
  const response = await api.get<DashboardResponse>(`/api/v1/users/${userId}/dashboard`, {
    params: {
      sections: params.sections,
      refresh: params.refresh
    }
  });
  return response.data;
}

export async function listNotifications(
  userId: string,
  params: ListNotificationsParams
): Promise<NotificationListResponse> {
  const response = await api.get<NotificationListResponse>(
    `/api/v1/users/${userId}/notifications`,
    {
      params: {
        channel: params.channel,
        status: params.status,
        limit: params.limit,
        cursor: params.cursor
      }
    }
  );
  return response.data;
}

export async function updateNotification(
  userId: string,
  notificationId: string,
  payload: NotificationUpdateRequest
): Promise<NotificationListResponse['notifications'][number]> {
  const response = await api.patch<NotificationListResponse['notifications'][number]>(
    `/api/v1/users/${userId}/notifications/${notificationId}`,
    payload
  );
  return response.data;
}

export async function upsertNotificationPreferences(
  userId: string,
  payload: NotificationPreferencesRequest
): Promise<NotificationPreferencesResponse> {
  const response = await api.put<NotificationPreferencesResponse>(
    `/api/v1/users/${userId}/notification-preferences`,
    payload
  );
  return response.data;
}

export async function importCandidates(
  payload: CandidateImportRequest
): Promise<CandidateImportResponse> {
  const response = await api.post<CandidateImportResponse>(
    '/api/v1/candidates/import',
    payload
  );
  return response.data;
}

export async function bulkImportUsers(
  payload: UserBulkImportRequest
): Promise<UserBulkImportResponse> {
  const response = await api.post<UserBulkImportResponse>('/api/v1/users/bulk-import', payload);
  return response.data;
}

export async function registerCandidate(
  payload: CandidateCreateRequest
): Promise<CandidateCreateResponse> {
  const response = await api.post<CandidateCreateResponse>(
    '/api/v1/candidates/register',
    payload
  );
  return response.data;
}

export async function listCandidateMatches(
  candidateId: string,
  params: ListCandidateMatchesParams
): Promise<CandidateMatchListResponse> {
  const response = await api.get<CandidateMatchListResponse>(
    `/api/v1/candidates/${candidateId}/matches`,
    {
      params: {
        type: params.type,
        cursor: params.cursor,
        limit: params.limit,
        include_partner_tags: params.includePartnerTags
      }
    }
  );
  return response.data;
}

export async function partnerCreateAssessment(
  payload: PartnerAssessmentCreateRequest
): Promise<PartnerAssessmentCreateResponse> {
  const response = await api.post<PartnerAssessmentCreateResponse>(
    '/api/v1/assessments/create',
    payload
  );
  return response.data;
}

export async function assignBatchAssessment(
  payload: BatchAssessmentRequest
): Promise<BatchAssessmentResponse> {
  const response = await api.post<BatchAssessmentResponse>(
    '/api/v1/assessments/assign-batch',
    payload
  );
  return response.data;
}

export async function quickVerifyAssessment(
  payload: QuickVerifyAssessmentRequest
): Promise<QuickVerifyAssessmentResponse> {
  const response = await api.post<QuickVerifyAssessmentResponse>(
    '/api/v1/assessments/quick-verify',
    payload
  );
  return response.data;
}

export async function syncJobs(payload: JobSyncRequest): Promise<JobSyncResponse> {
  const response = await api.post<JobSyncResponse>('/api/v1/jobs/sync', payload);
  return response.data;
}

export async function recordPlacement(
  payload: PlacementRecordRequest
): Promise<PlacementRecordResponse> {
  const response = await api.post<PlacementRecordResponse>(
    '/api/v1/placements/record',
    payload
  );
  return response.data;
}

export async function updatePlacementOutcome(
  payload: PlacementOutcomeRequest
): Promise<PlacementOutcomeResponse> {
  const response = await api.post<PlacementOutcomeResponse>(
    '/api/v1/placements/outcome',
    payload
  );
  return response.data;
}
