// Shared constants and helpers for the Interview Management module

export type InterviewScheduleItem = {
  // Primary ID field (API returns interviewId)
  id?: number;
  interviewId?: number;
  // Candidate info
  candidateId?: number;
  userId?: number;
  candidateName?: string;
  candidateEmail?: string;
  // Recruiter / Job info
  recruiterId?: number;
  recruiterName?: string;
  companyName?: string;
  jobId?: number;
  jobTitle?: string;
  // Schedule
  scheduleDate?: string;
  scheduleTime?: string | null;
  scheduleTimeSlot?: string | null;
  scheduleType?: number;
  interviewRound?: number;
  // Status
  status?: number;
  statusName?: string | null;
  interviewStatus?: string | null;
  // Candidate response
  candidateAccept?: string | null;
  // Skills / misc
  keyskills?: string | null;
  isAcceptedDiscount?: boolean;
  isRetakeInterview?: boolean;
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
  // Legacy fields
  feedbackId?: number;
  orderId?: number;
  supportAdminId?: number;
  productId?: number;
  serverExtension?: string | null;
};

export type InterviewStats = {
  totalInterviews?: number;
  completed?: number;
  scheduled?: number;
  pending?: number;
  cancelled?: number;
  todaysInterviews?: number;
  todayInterviews?: number;
  candidateAccepted?: number;
  candidateIgnored?: number;
  candidateNoResponse?: number;
};

export type RecruiterStat = {
  recruiterId?: number;
  recruiterName?: string;
  companyName?: string;
  name?: string;
  totalInterviews?: number;
  total?: number;
  completed?: number;
  pending?: number;
  completionPercentage?: number;
  completionRate?: number;
};

export type InterviewHistoryItem = {
  actionType?: string;
  action?: string;
  message?: string;
  description?: string;
  createdAt?: string;
  timestamp?: string;
  adminId?: number;
  userId?: number;
  performedBy?: number;
};

export type PaginationDetails = {
  totalCount?: number;
  pageSize?: number;
  currentPage?: number;
  totalPages?: number;
};

export type InterviewApiResponse = {
  // Shape used by GetAllInterviews: { paginationInterviews: { pagination, interviewList } }
  paginationInterviews?: {
    pagination?: PaginationDetails;
    interviewList?: InterviewScheduleItem[];
    interviews?: InterviewScheduleItem[];
    orderDto?: InterviewScheduleItem[];
  };
  // Legacy shape (older endpoints)
  paginationOrderData?: {
    pagination?: PaginationDetails;
    interviewList?: InterviewScheduleItem[];
    interviews?: InterviewScheduleItem[];
    interviewSchedules?: InterviewScheduleItem[];
    orderDto?: InterviewScheduleItem[];
  };
  paginationOrder?: {
    pagination?: PaginationDetails;
    orderDto?: InterviewScheduleItem[];
  };
  orderDto?: InterviewScheduleItem[];
  interviewSchedule?: InterviewScheduleItem[];
  interviewSchedules?: InterviewScheduleItem[];
  data?: InterviewScheduleItem[];
  isSuccess?: boolean;
  message?: string | null;
};

export const STATUS_OPTIONS = [
  { value: 1, label: 'Scheduled' },
  { value: 2, label: 'Completed' },
  { value: 3, label: 'Canceled' },
  { value: 4, label: 'Rescheduled' },
  { value: 5, label: 'Pending' },
  { value: 6, label: 'NoShow' },
  { value: 7, label: 'InCompleteInterview' },
  { value: 8, label: 'UnProcessedProfile' },
  { value: 9, label: 'ClosedInterview' },
  { value: 10, label: 'IsInprogress' },
  { value: 11, label: 'PartiallyCompleted' },
] as const;

export const STATUS_COLORS: Record<number, { bg: string; color: string }> = {
  1:  { bg: '#dbeafe', color: '#1d4ed8' },
  2:  { bg: '#d1fae5', color: '#065f46' },
  3:  { bg: '#fee2e2', color: '#b91c1c' },
  4:  { bg: '#ede9fe', color: '#6d28d9' },
  5:  { bg: '#fef3c7', color: '#92400e' },
  6:  { bg: '#f1f5f9', color: '#475569' },
  7:  { bg: '#ffedd5', color: '#9a3412' },
  8:  { bg: '#fce7f3', color: '#9d174d' },
  9:  { bg: '#f1f5f9', color: '#334155' },
  10: { bg: '#e0f2fe', color: '#0369a1' },
  11: { bg: '#ecfccb', color: '#3f6212' },
};

export function getStatusLabel(status: number | undefined): string {
  if (status == null) return '—';
  return STATUS_OPTIONS.find(o => o.value === status)?.label ?? `Status ${status}`;
}

export function extractRecords(response: InterviewApiResponse): InterviewScheduleItem[] {
  // GetAllInterviews shape: paginationInterviews.interviewList
  const pi = response.paginationInterviews;
  if (pi) {
    return pi.interviewList ?? pi.interviews ?? pi.orderDto ?? [];
  }
  // Legacy shape: paginationOrderData
  const pod = response.paginationOrderData;
  if (pod) {
    const known = pod.interviewList ?? pod.interviews ?? pod.interviewSchedules ?? pod.orderDto;
    if (known != null) return known;
    for (const val of Object.values(pod)) {
      if (Array.isArray(val)) return val as InterviewScheduleItem[];
    }
  }
  // Older endpoints
  const legacy =
    response.paginationOrder?.orderDto ??
    response.interviewSchedules ??
    response.interviewSchedule ??
    response.orderDto ??
    response.data;
  if (legacy != null) return legacy;
  // Last resort: scan nested objects for any array
  for (const val of Object.values(response)) {
    if (Array.isArray(val)) return val as InterviewScheduleItem[];
    if (val && typeof val === 'object') {
      for (const nested of Object.values(val as object)) {
        if (Array.isArray(nested)) return nested as InterviewScheduleItem[];
      }
    }
  }
  return [];
}

export function extractPagination(response: InterviewApiResponse): PaginationDetails | null {
  return (
    response.paginationInterviews?.pagination ??
    response.paginationOrderData?.pagination ??
    response.paginationOrder?.pagination ??
    null
  );
}

export function resolveItemId(item: InterviewScheduleItem): number | undefined {
  return item.interviewId ?? item.id;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
}

export function resolveErrorMessage(error: { status?: number; error?: unknown }): string {
  if (error.status === 401 || error.status === 403) {
    return 'You are not authorized. Please sign in again.';
  }
  if (error.status === 404) {
    return 'API endpoint not found. Please check API configuration.';
  }
  if (typeof error.error === 'object' && error.error !== null) {
    const msg = (error.error as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  return 'An unexpected error occurred. Please try again.';
}
