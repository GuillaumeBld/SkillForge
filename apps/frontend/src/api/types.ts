export interface HealthResponse {
  status: string;
  timestamp: string;
}

export interface UserCreateRequest {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  preferred_roles?: string[];
  education?: {
    highest_level?: string;
    institution?: string;
    credential_ids?: string[];
  };
  goals?: string[];
  marketing_opt_in?: boolean;
}

export interface UserCreateResponse {
  status: 'success';
  user_id: string;
  profile_completion?: number;
  required_actions?: string[];
}

export type ResumeUploadSource = 'uploaded' | 'linkedin' | 'partner_import';

export interface ResumeUploadResponse {
  status: 'processing';
  resume_id: string;
  ingestion_state: 'queued' | 'processing' | 'completed';
  estimated_completion_seconds?: number;
}

export interface ResumeStatusResponse {
  status: string;
  resume_id: string;
  ingestion_state: 'queued' | 'processing' | 'completed' | 'failed';
  estimated_completion_seconds?: number;
  jaat_vectors?: Record<string, number>;
}

export interface AssessmentCreateRequest {
  assessment_template_id: string;
  delivery_mode: 'asynchronous' | 'synchronous';
  due_at?: string;
  notify_user?: boolean;
}

export interface AssessmentCreateResponse {
  status: 'scheduled';
  assessment_id: string;
  launch_url: string;
  skills_benchmarked?: BenchmarkedSkill[];
}

export interface AssessmentUpdateRequest {
  status?: 'queued' | 'in_progress' | 'completed';
  due_at?: string;
  notify_user?: boolean;
}

export interface AssessmentResource {
  assessment_id: string;
  status: 'queued' | 'in_progress' | 'completed';
  template_id?: string;
  due_at?: string;
}

export interface AssessmentListResponse extends PaginatedResponse {
  results: AssessmentResource[];
}

export interface BenchmarkedSkill {
  skill_name: string;
  taxonomy_source?: string;
  reference?: string;
}

export type MatchType = 'jobs' | 'courses' | 'mentors';

export interface MatchResource {
  id: string;
  title: string;
  match_score: number;
  summary?: string;
  top_skills?: string[];
  partner_tags?: string[];
  source_reference?: string;
}

export interface MatchListResponse extends PaginatedResponse {
  user_id: string;
  type: MatchType;
  results: MatchResource[];
}

export interface DashboardResponse {
  status: 'success';
  sections: Record<string, unknown>;
  generated_at: string;
}

export type NotificationChannel = 'email' | 'sms' | 'in_app';
export type NotificationStatus = 'unread' | 'read';

export interface NotificationAction {
  type: 'open_url';
  label: string;
  url: string;
}

export interface NotificationResource {
  id: string;
  category: string;
  message: string;
  delivered_at: string;
  channel: NotificationChannel;
  status?: NotificationStatus;
  actions?: NotificationAction[];
}

export interface NotificationListResponse extends PaginatedResponse {
  notifications: NotificationResource[];
}

export interface NotificationUpdateRequest {
  status: NotificationStatus;
}

export interface NotificationPreferencesRequest {
  channels: Partial<Record<NotificationChannel, NotificationStatus>>;
  digest_frequency?: 'daily' | 'weekly' | 'monthly';
  quiet_hours?: {
    start: string;
    end: string;
  };
}

export interface NotificationPreferencesResponse {
  status: 'success';
  channels: Partial<Record<NotificationChannel, NotificationStatus>>;
  digest_frequency?: 'daily' | 'weekly' | 'monthly';
  quiet_hours?: {
    start: string;
    end: string;
  };
  updated_at: string;
}

export interface PaginatedResponse {
  status: 'success';
  next_cursor: string | null;
}

export interface CandidateImportRequest {
  batch_id?: string;
  webhook_url?: string;
  candidates: CandidateImportEntry[];
}

export interface CandidateImportEntry {
  external_id: string;
  name: string;
  email: string;
  resume_url?: string;
  base64_content?: string;
  metadata?: Record<string, unknown>;
}

export interface CandidateImportResponse {
  status: string;
  batch_id: string;
  processed: number;
  failed: number;
  results: CandidateImportResult[];
  next_poll_url: string;
}

export interface CandidateImportResult {
  external_id: string;
  status: 'processed' | 'failed';
  candidate_id?: string;
  jaat_vector_version?: string;
  webhook_delivery?: string;
  error?: string;
}

export interface UserBulkImportRequest {
  partner_id: string;
  environment: 'sandbox' | 'production';
  users: Array<{
    external_id: string;
    first_name: string;
    last_name: string;
    email: string;
    cohort?: string;
    invite_code?: string;
  }>;
}

export interface UserBulkImportResponse {
  status: string;
  batch_id: string;
  queued: number;
  estimated_completion_seconds?: number;
}

export interface CandidateCreateRequest {
  external_id: string;
  name: string;
  email: string;
  phone?: string;
  resume_url?: string;
  partner_tags?: string[];
}

export interface CandidateCreateResponse {
  status: 'success';
  candidate_id: string;
  onboarding_url?: string;
}

export interface CandidateMatchListResponse extends PaginatedResponse {
  candidate_id: string;
  type: MatchType;
  results: MatchResource[];
}

export interface PartnerAssessmentCreateRequest {
  candidate_id: string;
  assessment_template_id: string;
  delivery_mode: 'synchronous' | 'asynchronous';
  due_at?: string;
  notify_candidate?: boolean;
}

export interface PartnerAssessmentCreateResponse {
  status: 'scheduled';
  assessment_id: string;
  launch_url: string;
}

export interface BatchAssessmentRequest {
  cohort_id: string;
  assessment_template_id: string;
  candidate_ids: string[];
  window_start?: string;
  window_end?: string;
}

export interface BatchAssessmentResponse {
  status: string;
  batch_id: string;
  queued: number;
  estimated_completion_seconds?: number;
}

export interface QuickVerifyAssessmentRequest {
  candidate_id: string;
  assessment_template_id: string;
  mode?: 'live_proctored' | 'async';
}

export interface QuickVerifyAssessmentResponse {
  status: string;
  verification_id: string;
  launch_url: string;
}

export interface JobSyncRequest {
  partner_id: string;
  jobs: Array<{
    job_id: string;
    title: string;
    location?: string;
    employment_type?: string;
    compensation?: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface JobSyncResponse {
  status: string;
  synced: number;
  failed: number;
  job_ids: string[];
}

export interface PlacementRecordRequest {
  candidate_id: string;
  job_id: string;
  employer_name: string;
  placement_date: string;
  employment_type: string;
  compensation?: string;
}

export interface PlacementRecordResponse {
  status: string;
  placement_id: string;
  dashboard_url?: string;
}

export interface PlacementOutcomeRequest {
  placement_id: string;
  outcome: 'retained' | 'terminated' | 'withdrawn';
  notes?: string;
}

export interface PlacementOutcomeResponse {
  status: string;
  placement_id: string;
  updated_at: string;
}

export interface ApiErrorPayload {
  status: 'error';
  message: string;
  code?: string;
  correlation_id?: string;
  errors?: Array<{ field?: string; message?: string }>;
}

export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

export interface ListUserAssessmentsParams extends PaginationParams {
  status?: 'queued' | 'in_progress' | 'completed';
}

export interface ListMatchesParams extends PaginationParams {
  type: MatchType;
  includeJaatDebug?: boolean;
}

export interface DashboardParams {
  sections?: string;
  refresh?: boolean;
}

export interface ListNotificationsParams extends PaginationParams {
  channel?: NotificationChannel;
  status?: NotificationStatus;
}

export interface ListCandidateMatchesParams extends PaginationParams {
  type: MatchType;
  includePartnerTags?: boolean;
}
