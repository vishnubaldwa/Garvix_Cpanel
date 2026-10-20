/**
 * Garvix Hosting Manager — Typed REST API Envelopes & Error Catalog
 */

export type GarvixApiErrorCode =
  | 'AUTH_INVALID_CREDENTIALS'
  | 'AUTH_MFA_REQUIRED'
  | 'AUTH_STEP_UP_MFA_REQUIRED'
  | 'AUTHZ_FORBIDDEN_ROLE'
  | 'AUTHZ_CROSS_TENANT_ACCESS_DENIED'
  | 'AUTHZ_RESELLER_QUOTA_EXCEEDED'
  | 'VALIDATION_FAILED'
  | 'SECURITY_PATH_TRAVERSAL_BLOCKED'
  | 'SECURITY_SHELL_METACHAR_BLOCKED'
  | 'RESOURCE_NOT_FOUND'
  | 'RESOURCE_CONFLICT'
  | 'IDEMPOTENCY_KEY_REPLAY'
  | 'LICENSE_EXPIRED_READ_ONLY_MODE'
  | 'LICENSE_SIGNATURE_INVALID'
  | 'AGENT_DRY_RUN_ONLY'
  | 'AGENT_EXECUTION_ROLLED_BACK'
  | 'RATE_LIMIT_EXCEEDED';

export interface ApiSuccessEnvelope<TData> {
  success: true;
  requestId: string;
  timestamp: string;
  isMockData?: boolean;
  data: TData;
}

export interface ApiErrorEnvelope {
  success: false;
  requestId: string;
  timestamp: string;
  error: {
    code: GarvixApiErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export interface AsyncJobAcceptedEnvelope {
  success: true;
  requestId: string;
  timestamp: string;
  jobId: string;
  status: 'QUEUED' | 'RUNNING' | 'DRY_RUN_READY';
  isDryRun: boolean;
  pollUrl: string;
}

export type ApiResponseEnvelope<TData> = ApiSuccessEnvelope<TData> | ApiErrorEnvelope;

export const API_V1_ROUTES = {
  auth: {
    login: '/api/v1/auth/login',
    logout: '/api/v1/auth/logout',
    refresh: '/api/v1/auth/refresh',
    mfaVerify: '/api/v1/auth/mfa/verify',
    session: '/api/v1/auth/session',
  },
  servers: {
    list: '/api/v1/servers',
    create: '/api/v1/servers',
    detail: (id: string) => `/api/v1/servers/${id}`,
    health: (id: string) => `/api/v1/servers/${id}/health`,
    metrics: (id: string) => `/api/v1/servers/${id}/metrics`,
  },
  hostingAccounts: {
    list: '/api/v1/hosting-accounts',
    create: '/api/v1/hosting-accounts',
    detail: (id: string) => `/api/v1/hosting-accounts/${id}`,
    suspend: (id: string) => `/api/v1/hosting-accounts/${id}/suspend`,
  },
  domains: {
    list: '/api/v1/domains',
    create: '/api/v1/domains',
    detail: (id: string) => `/api/v1/domains/${id}`,
    dns: (id: string) => `/api/v1/domains/${id}/dns`,
  },
  email: {
    domains: '/api/v1/email/domains',
    mailboxes: '/api/v1/email/mailboxes',
    mailboxDetail: (id: string) => `/api/v1/email/mailboxes/${id}`,
    resetPassword: (id: string) => `/api/v1/email/mailboxes/${id}/reset-password`,
  },
  databases: {
    list: '/api/v1/databases',
    create: '/api/v1/databases',
    createUser: (id: string) => `/api/v1/databases/${id}/users`,
    createBackup: (id: string) => `/api/v1/databases/${id}/backups`,
  },
  ssl: {
    certificates: '/api/v1/ssl/certificates',
    renew: (id: string) => `/api/v1/ssl/certificates/${id}/renew`,
  },
  jobs: {
    list: '/api/v1/jobs',
    detail: (id: string) => `/api/v1/jobs/${id}`,
    cancel: (id: string) => `/api/v1/jobs/${id}/cancel`,
  },
  cloudLicensing: {
    activate: '/cloud/api/v1/licenses/activate',
    validate: '/cloud/api/v1/licenses/validate',
    deactivate: '/cloud/api/v1/licenses/deactivate',
    entitlements: (id: string) => `/cloud/api/v1/licenses/${id}/entitlements`,
    latestRelease: '/cloud/api/v1/releases/latest',
  },
} as const;
