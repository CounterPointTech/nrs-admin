import {
  ApiResponse,
  ConnectionStatusResponse,
  ConnectionSettingsResponse,
  SaveConnectionRequest,
  TestConnectionRequest,
  TestConnectionResponse,
  TestPathResponse,
  BrowseResponse,
  LoginRequest,
  LoginResponse,
  RefreshRequest,
  UserInfo,
  Facility,
  Modality,
  ModalityType,
  CreateModalityRequest,
  UpdateModalityRequest,
  MappingEntry,
  MappingBackup,
  AeActivity,
  Study,
  StudyDetail,
  StudySearchFilters,
  UpdateStudyRequest,
  BulkUpdateStatusRequest,
  BulkUpdateResult,
  Series,
  Dataset,
  PagedResponse,
  DashboardStats,
  SharedSetting,
  SiteSetting,
  UnifiedSetting,
  SettingsOverview,
  SettingSource,
  PacsDestination,
  CreatePacsDestinationRequest,
  UpdatePacsDestinationRequest,
  RouteHistoryEntry,
  RoutingZone,
  CreateRoutingZoneRequest,
  UpdateRoutingZoneRequest,
  BillingServiceCode,
  CreateCptCodeRequest,
  UpdateCptCodeRequest,
  CptCodeSearchFilters,
  CptImportPreviewResponse,
  CptImportExecuteRequest,
  CptImportExecuteResponse,
  IcdCode,
  IcdCategory,
  CreateIcdCodeRequest,
  UpdateIcdCodeRequest,
  IcdCodeSearchFilters,
  ReportTemplateInfo,
  ReportTemplateBackup,
  TemplatePlaceholder,
  TemplateSection,
  SaveReportTemplateRequest,
  CreateReportTemplateRequest,
  DuplicateReportTemplateRequest,
  RenderPreviewRequest,
  UnifiedStudyDetail,
  UpdateRisOrderRequest,
  UpdateRisOrderProcedureRequest,
  UpdateRisPatientDetailsRequest,
  UpdateSeriesRequest,
  UpdateRisReportRequest,
  CreateRisReportRequest,
  LinkStudyRequest,
  PatientMergeRequest,
  SearchRisOrdersFilters,
  SyncFieldRequest,
  RisOrder,
  PatientGroup,
  StandardReport,
  PatientDeletionPreview,
  MergeOrdersRequest,
  MergeProceduresRequest,
  RouteQueueItem,
  RouteError,
  RouteHistoryItem,
  QueueSummaryResponse,
  RouteQueueSearchParams,
  RouteHistorySearchParams,
  QueueStudyRequest,
  QueueSeriesRequest,
  ExternalTool,
  CreateExternalToolRequest,
  UpdateExternalToolRequest,
  ReorderExternalToolsRequest,
  ServicesSnapshot,
  ServiceInfo,
  ServiceAction,
  Physician,
  Site,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Token storage
let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
}

export function getTokens() {
  if (typeof window !== 'undefined' && !accessToken) {
    accessToken = localStorage.getItem('accessToken');
    refreshToken = localStorage.getItem('refreshToken');
  }
  return { accessToken, refreshToken };
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
}

// Base fetch with auth
async function fetchWithAuth<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const tokens = getTokens();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (tokens.accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${tokens.accessToken}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401) {
      if (tokens.refreshToken) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
          const retryResponse = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
          });
          const retryData = await retryResponse.json();
          if (typeof retryData === 'object' && retryData !== null && 'success' in retryData) {
            return retryData;
          }
          return { success: true, data: retryData } as ApiResponse<T>;
        }
      }
      // Refresh failed or no refresh token — session expired, redirect to login
      clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return { success: false, message: 'Session expired' };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        message: errorData?.message || `HTTP error ${response.status}`,
        errors: errorData?.errors,
      };
    }

    if (response.status === 204) {
      return { success: true } as ApiResponse<T>;
    }

    const data = await response.json();
    if (typeof data === 'object' && data !== null && 'success' in data) {
      return data;
    }
    return { success: true, data } as ApiResponse<T>;
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Dedup: if a refresh is already in-flight, reuse that promise
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = doRefresh();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefresh(): Promise<boolean> {
  const tokens = getTokens();
  if (!tokens.accessToken || !tokens.refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      } as RefreshRequest),
    });

    if (!response.ok) {
      return false;
    }

    const result: ApiResponse<LoginResponse> = await response.json();
    if (result.success && result.data) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ============== Connection API ==============
export const connectionApi = {
  getStatus: async (): Promise<ApiResponse<ConnectionStatusResponse>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/connection/status`, {
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to check connection status',
      };
    }
  },

  getSettings: async (): Promise<ApiResponse<ConnectionSettingsResponse>> => {
    return fetchWithAuth<ConnectionSettingsResponse>('/api/v1/connection');
  },

  save: async (request: SaveConnectionRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/connection', {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  testConnection: async (request: TestConnectionRequest): Promise<ApiResponse<TestConnectionResponse>> => {
    return fetchWithAuth<TestConnectionResponse>('/api/v1/connection/test', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  testPath: async (path: string): Promise<ApiResponse<TestPathResponse>> => {
    return fetchWithAuth<TestPathResponse>('/api/v1/connection/test-path', {
      method: 'POST',
      body: JSON.stringify({ path }),
    });
  },

  browse: async (path?: string, type: 'file' | 'directory' = 'file'): Promise<ApiResponse<BrowseResponse>> => {
    const params = new URLSearchParams();
    if (path) params.set('path', path);
    params.set('type', type);
    return fetchWithAuth<BrowseResponse>(`/api/v1/connection/browse?${params.toString()}`);
  },
};

// ============== Auth API ==============
export const authApi = {
  login: async (request: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const result: ApiResponse<LoginResponse> = await response.json();
      if (result.success && result.data) {
        setTokens(result.data.accessToken, result.data.refreshToken);
      }
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  },

  refresh: async (): Promise<ApiResponse<LoginResponse>> => {
    const tokens = getTokens();
    if (!tokens.accessToken || !tokens.refreshToken) {
      return { success: false, message: 'No tokens available' };
    }
    const refreshed = await refreshAccessToken();
    if (refreshed && accessToken) {
      return {
        success: true,
        data: { accessToken, refreshToken: tokens.refreshToken! } as LoginResponse,
      };
    }
    return { success: false, message: 'Token refresh failed' };
  },

  me: async (): Promise<ApiResponse<UserInfo>> => {
    return fetchWithAuth<UserInfo>('/api/v1/auth/me');
  },

  logout: () => {
    clearTokens();
  },
};

// ============== Facility API ==============
export const facilityApi = {
  getAll: async (): Promise<ApiResponse<Facility[]>> => {
    return fetchWithAuth<Facility[]>('/api/v1/facilities');
  },
};

// ============== Sites API ==============
export const siteApi = {
  getAll: async (): Promise<ApiResponse<Site[]>> => {
    return fetchWithAuth<Site[]>('/api/v1/sites');
  },
};

// ============== Modality API ==============
export const modalityApi = {
  getAll: async (facilityId?: number, search?: string): Promise<ApiResponse<Modality[]>> => {
    return fetchWithAuth<Modality[]>(
      `/api/v1/modalities${buildQueryString({ facilityId, search })}`
    );
  },

  getById: async (id: number): Promise<ApiResponse<Modality>> => {
    return fetchWithAuth<Modality>(`/api/v1/modalities/${id}`);
  },

  create: async (request: CreateModalityRequest): Promise<ApiResponse<Modality>> => {
    return fetchWithAuth<Modality>('/api/v1/modalities', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateModalityRequest): Promise<ApiResponse<Modality>> => {
    return fetchWithAuth<Modality>(`/api/v1/modalities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/modalities/${id}`, { method: 'DELETE' });
  },
};

// ============== Modality Types API ==============
export const modalityTypeApi = {
  getAll: async (): Promise<ApiResponse<ModalityType[]>> => {
    return fetchWithAuth<ModalityType[]>('/api/v1/modality-types');
  },

  create: async (type: ModalityType): Promise<ApiResponse<ModalityType>> => {
    return fetchWithAuth<ModalityType>('/api/v1/modality-types', {
      method: 'POST',
      body: JSON.stringify(type),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/modality-types/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

// ============== Mapping File API ==============
export const mappingApi = {
  getEntries: async (): Promise<ApiResponse<MappingEntry[]>> => {
    return fetchWithAuth<MappingEntry[]>('/api/v1/mapping');
  },

  getRaw: async (): Promise<ApiResponse<string>> => {
    return fetchWithAuth<string>('/api/v1/mapping/raw');
  },

  saveEntries: async (entries: MappingEntry[]): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/mapping', {
      method: 'PUT',
      body: JSON.stringify({ entries }),
    });
  },

  saveRaw: async (content: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/mapping/raw', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  },

  getBackups: async (): Promise<ApiResponse<MappingBackup[]>> => {
    return fetchWithAuth<MappingBackup[]>('/api/v1/mapping/backups');
  },

  restore: async (fileName: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/mapping/restore/${encodeURIComponent(fileName)}`, {
      method: 'POST',
    });
  },
};

// ============== AE Monitor API ==============
export const aeMonitorApi = {
  getRecent: async (hours = 1): Promise<ApiResponse<AeActivity[]>> => {
    return fetchWithAuth<AeActivity[]>(`/api/v1/ae-monitor/recent${buildQueryString({ hours })}`);
  },
};

// ============== Study API ==============
export const studyApi = {
  search: async (
    page = 1,
    pageSize = 50,
    filters?: StudySearchFilters
  ): Promise<ApiResponse<PagedResponse<Study>>> => {
    return fetchWithAuth<PagedResponse<Study>>(
      `/api/v1/studies${buildQueryString({ page, pageSize, ...filters })}`
    );
  },

  getById: async (id: number): Promise<ApiResponse<StudyDetail>> => {
    return fetchWithAuth<StudyDetail>(`/api/v1/studies/${id}`);
  },

  update: async (id: number, data: UpdateStudyRequest): Promise<ApiResponse<StudyDetail>> => {
    return fetchWithAuth<StudyDetail>(`/api/v1/studies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  bulkUpdateStatus: async (request: BulkUpdateStatusRequest): Promise<ApiResponse<BulkUpdateResult>> => {
    return fetchWithAuth<BulkUpdateResult>('/api/v1/studies/bulk-status', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  exportCsv: async (filters?: StudySearchFilters): Promise<void> => {
    const tokens = getTokens();
    const qs = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    const response = await fetch(`${API_BASE_URL}/api/v1/studies/export${qs}`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('content-disposition')?.split('filename=')[1] ?? 'studies-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  getSeries: async (studyId: number): Promise<ApiResponse<Series[]>> => {
    return fetchWithAuth<Series[]>(`/api/v1/studies/${studyId}/series`);
  },

  getDatasets: async (seriesId: number): Promise<ApiResponse<Dataset[]>> => {
    return fetchWithAuth<Dataset[]>(`/api/v1/series/${seriesId}/datasets`);
  },

  updateSeries: async (seriesId: number, data: UpdateSeriesRequest): Promise<ApiResponse<Series[]>> => {
    return fetchWithAuth<Series[]>(`/api/v1/studies/series/${seriesId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // Unified study detail (PACS + RIS)
  getUnified: async (id: number): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${id}/unified`);
  },

  // RIS patient details editing
  updateRisPatientDetails: async (
    studyId: number,
    data: UpdateRisPatientDetailsRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/ris-patient`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // RIS report editing
  updateRisReport: async (
    studyId: number,
    reportId: number,
    data: UpdateRisReportRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/ris-report/${reportId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  createRisReport: async (
    studyId: number,
    data: CreateRisReportRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/ris-report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // RIS order editing
  updateRisOrder: async (
    studyId: number,
    orderId: number,
    data: UpdateRisOrderRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/ris-order/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // RIS procedure editing
  updateRisProcedure: async (
    studyId: number,
    procedureId: number,
    data: UpdateRisOrderProcedureRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(
      `/api/v1/studies/${studyId}/ris-procedure/${procedureId}`,
      { method: 'PUT', body: JSON.stringify(data) }
    );
  },

  // Link study to RIS order
  linkToOrder: async (
    studyId: number,
    request: LinkStudyRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/link`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Unlink study from RIS
  unlinkOrder: async (studyId: number): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/unlink`, {
      method: 'POST',
    });
  },

  // Patient merge
  mergePatient: async (
    studyId: number,
    request: PatientMergeRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/merge-patient`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  // Search RIS orders for linking
  searchRisOrders: async (
    studyId: number,
    params: SearchRisOrdersFilters
  ): Promise<ApiResponse<PagedResponse<RisOrder>>> => {
    return fetchWithAuth<PagedResponse<RisOrder>>(
      `/api/v1/studies/${studyId}/ris-orders/search${buildQueryString(params as Record<string, unknown>)}`
    );
  },

  // Field sync between PACS and RIS
  syncField: async (
    studyId: number,
    request: SyncFieldRequest
  ): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/sync-field`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getPatientGroups: async (): Promise<ApiResponse<PatientGroup[]>> => {
    return fetchWithAuth<PatientGroup[]>('/api/v1/studies/patient-groups');
  },

  updatePatientGroup: async (studyId: number, patientGroup: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/studies/${studyId}/patient-group`, {
      method: 'PUT',
      body: JSON.stringify({ patientGroup }),
    });
  },

  mergeOrders: async (studyId: number, request: MergeOrdersRequest): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/merge-orders`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  mergeProcedures: async (studyId: number, request: MergeProceduresRequest): Promise<ApiResponse<UnifiedStudyDetail>> => {
    return fetchWithAuth<UnifiedStudyDetail>(`/api/v1/studies/${studyId}/merge-procedures`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  getStandardReports: async (): Promise<ApiResponse<StandardReport[]>> => {
    return fetchWithAuth<StandardReport[]>('/api/v1/studies/standard-reports');
  },

  createStandardReport: async (name: string, text: string, createdBy?: string): Promise<ApiResponse<StandardReport>> => {
    return fetchWithAuth<StandardReport>('/api/v1/studies/standard-reports', {
      method: 'POST',
      body: JSON.stringify({ shortReportName: name, reportText: text, createdBy }),
    });
  },

  deleteStandardReport: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/studies/standard-reports/${id}`, { method: 'DELETE' });
  },

  getPatientDeletionPreview: async (studyId: number): Promise<ApiResponse<PatientDeletionPreview>> => {
    return fetchWithAuth<PatientDeletionPreview>(`/api/v1/studies/${studyId}/patient-deletion-preview`);
  },

  deleteRisPatient: async (studyId: number, clearInsurance: boolean): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/studies/${studyId}/ris-patient?clearInsurance=${clearInsurance}`, {
      method: 'DELETE',
    });
  },
};

// ============== Dashboard API ==============
export const dashboardApi = {
  getStats: async (): Promise<ApiResponse<DashboardStats>> => {
    return fetchWithAuth<DashboardStats>('/api/v1/dashboard/stats');
  },
};

// ============== Settings API ==============
export const settingsApi = {
  getShared: async (search?: string): Promise<ApiResponse<SharedSetting[]>> => {
    return fetchWithAuth<SharedSetting[]>(
      `/api/v1/settings/shared${buildQueryString({ search })}`
    );
  },

  getSharedByName: async (name: string): Promise<ApiResponse<SharedSetting>> => {
    return fetchWithAuth<SharedSetting>(`/api/v1/settings/shared/${encodeURIComponent(name)}`);
  },

  updateShared: async (name: string, value?: string): Promise<ApiResponse<SharedSetting>> => {
    return fetchWithAuth<SharedSetting>(`/api/v1/settings/shared/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  getSite: async (search?: string): Promise<ApiResponse<SiteSetting[]>> => {
    return fetchWithAuth<SiteSetting[]>(
      `/api/v1/settings/site${buildQueryString({ search })}`
    );
  },

  getSiteByName: async (name: string): Promise<ApiResponse<SiteSetting>> => {
    return fetchWithAuth<SiteSetting>(`/api/v1/settings/site/${encodeURIComponent(name)}`);
  },

  updateSite: async (name: string, value?: string): Promise<ApiResponse<SiteSetting>> => {
    return fetchWithAuth<SiteSetting>(`/api/v1/settings/site/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },

  // Unified endpoints
  getAll: async (): Promise<ApiResponse<UnifiedSetting[]>> => {
    return fetchWithAuth<UnifiedSetting[]>('/api/v1/settings/all');
  },

  getOverview: async (): Promise<ApiResponse<SettingsOverview>> => {
    return fetchWithAuth<SettingsOverview>('/api/v1/settings/overview');
  },

  updateUnified: async (source: SettingSource, name: string, value?: string): Promise<ApiResponse<unknown>> => {
    const routeMap: Record<SettingSource, string> = {
      shared: 'shared',
      site: 'site',
      pacs: 'pacs',
      ris: 'ris',
      object_store: 'object-store',
      pacs_options: 'pacs-options',
      ris_options: 'ris-options',
    };
    const route = routeMap[source];
    return fetchWithAuth(`/api/v1/settings/${route}/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    });
  },
};

// ============== PACS Destinations API ==============
export const pacsDestinationApi = {
  getAll: async (): Promise<ApiResponse<PacsDestination[]>> => {
    return fetchWithAuth<PacsDestination[]>('/api/v1/pacs/destinations');
  },

  getById: async (id: number): Promise<ApiResponse<PacsDestination>> => {
    return fetchWithAuth<PacsDestination>(`/api/v1/pacs/destinations/${id}`);
  },

  create: async (request: CreatePacsDestinationRequest): Promise<ApiResponse<PacsDestination>> => {
    return fetchWithAuth<PacsDestination>('/api/v1/pacs/destinations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdatePacsDestinationRequest): Promise<ApiResponse<PacsDestination>> => {
    return fetchWithAuth<PacsDestination>(`/api/v1/pacs/destinations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/pacs/destinations/${id}`, { method: 'DELETE' });
  },

  getHistory: async (id: number, limit = 100): Promise<ApiResponse<RouteHistoryEntry[]>> => {
    return fetchWithAuth<RouteHistoryEntry[]>(
      `/api/v1/pacs/destinations/${id}/history${buildQueryString({ limit })}`
    );
  },
};

// ============== Routing Zones API ==============
export const routingZoneApi = {
  getAll: async (): Promise<ApiResponse<RoutingZone[]>> => {
    return fetchWithAuth<RoutingZone[]>('/api/v1/pacs/routing-zones');
  },

  getById: async (id: number): Promise<ApiResponse<RoutingZone>> => {
    return fetchWithAuth<RoutingZone>(`/api/v1/pacs/routing-zones/${id}`);
  },

  create: async (request: CreateRoutingZoneRequest): Promise<ApiResponse<RoutingZone>> => {
    return fetchWithAuth<RoutingZone>('/api/v1/pacs/routing-zones', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateRoutingZoneRequest): Promise<ApiResponse<RoutingZone>> => {
    return fetchWithAuth<RoutingZone>(`/api/v1/pacs/routing-zones/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/pacs/routing-zones/${id}`, { method: 'DELETE' });
  },
};

// ============== CPT Codes API ==============
export const cptCodeApi = {
  search: async (
    page = 1,
    pageSize = 50,
    filters?: CptCodeSearchFilters
  ): Promise<ApiResponse<PagedResponse<BillingServiceCode>>> => {
    return fetchWithAuth<PagedResponse<BillingServiceCode>>(
      `/api/v1/cpt-codes${buildQueryString({ page, pageSize, ...filters })}`
    );
  },

  getById: async (id: number): Promise<ApiResponse<BillingServiceCode>> => {
    return fetchWithAuth<BillingServiceCode>(`/api/v1/cpt-codes/${id}`);
  },

  getModalityTypes: async (): Promise<ApiResponse<string[]>> => {
    return fetchWithAuth<string[]>('/api/v1/cpt-codes/modality-types');
  },

  create: async (request: CreateCptCodeRequest): Promise<ApiResponse<BillingServiceCode>> => {
    return fetchWithAuth<BillingServiceCode>('/api/v1/cpt-codes', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateCptCodeRequest): Promise<ApiResponse<BillingServiceCode>> => {
    return fetchWithAuth<BillingServiceCode>(`/api/v1/cpt-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/cpt-codes/${id}`, { method: 'DELETE' });
  },

  exportCsv: async (filters?: CptCodeSearchFilters): Promise<void> => {
    const tokens = getTokens();
    const qs = filters ? buildQueryString(filters as Record<string, unknown>) : '';
    const response = await fetch(`${API_BASE_URL}/api/v1/cpt-codes/export${qs}`, {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = response.headers.get('content-disposition')?.split('filename=')[1] ?? 'cpt-codes-export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  importPreview: async (file: File): Promise<ApiResponse<CptImportPreviewResponse>> => {
    const tokens = getTokens();
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/cpt-codes/import/preview`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: formData,
      });
      const data = await response.json();
      if (typeof data === 'object' && data !== null && 'success' in data) {
        return data;
      }
      return { success: true, data } as ApiResponse<CptImportPreviewResponse>;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Import preview failed',
      };
    }
  },

  importExecute: async (request: CptImportExecuteRequest): Promise<ApiResponse<CptImportExecuteResponse>> => {
    return fetchWithAuth<CptImportExecuteResponse>('/api/v1/cpt-codes/import/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// ============== ICD Codes API ==============
export const icdCodeApi = {
  search: async (
    page = 1,
    pageSize = 50,
    filters?: IcdCodeSearchFilters
  ): Promise<ApiResponse<PagedResponse<IcdCode>>> => {
    return fetchWithAuth<PagedResponse<IcdCode>>(
      `/api/v1/icd-codes${buildQueryString({ page, pageSize, ...filters })}`
    );
  },

  getById: async (id: string): Promise<ApiResponse<IcdCode>> => {
    return fetchWithAuth<IcdCode>(`/api/v1/icd-codes/${encodeURIComponent(id)}`);
  },

  getCategories: async (version?: number): Promise<ApiResponse<IcdCategory[]>> => {
    return fetchWithAuth<IcdCategory[]>(
      `/api/v1/icd-codes/categories${buildQueryString({ version })}`
    );
  },

  create: async (request: CreateIcdCodeRequest): Promise<ApiResponse<IcdCode>> => {
    return fetchWithAuth<IcdCode>('/api/v1/icd-codes', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: string, request: UpdateIcdCodeRequest): Promise<ApiResponse<IcdCode>> => {
    return fetchWithAuth<IcdCode>(`/api/v1/icd-codes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/icd-codes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  markObsolete: async (id: string): Promise<ApiResponse<IcdCode>> => {
    return fetchWithAuth<IcdCode>(`/api/v1/icd-codes/${encodeURIComponent(id)}/obsolete`, {
      method: 'POST',
    });
  },

  restore: async (id: string): Promise<ApiResponse<IcdCode>> => {
    return fetchWithAuth<IcdCode>(`/api/v1/icd-codes/${encodeURIComponent(id)}/restore`, {
      method: 'POST',
    });
  },
};

// ============== Report Templates API ==============
export const reportTemplateApi = {
  list: async (): Promise<ApiResponse<ReportTemplateInfo[]>> => {
    return fetchWithAuth<ReportTemplateInfo[]>('/api/v1/report-templates');
  },

  read: async (name: string): Promise<ApiResponse<string>> => {
    return fetchWithAuth<string>(`/api/v1/report-templates/${encodeURIComponent(name)}`);
  },

  save: async (name: string, request: SaveReportTemplateRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/report-templates/${encodeURIComponent(name)}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  create: async (request: CreateReportTemplateRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/report-templates', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  delete: async (name: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/report-templates/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },

  duplicate: async (name: string, request: DuplicateReportTemplateRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/report-templates/${encodeURIComponent(name)}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  listBackups: async (): Promise<ApiResponse<ReportTemplateBackup[]>> => {
    return fetchWithAuth<ReportTemplateBackup[]>('/api/v1/report-templates/backups');
  },

  restoreBackup: async (fileName: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/report-templates/backups/restore/${encodeURIComponent(fileName)}`, {
      method: 'POST',
    });
  },

  getPlaceholders: async (): Promise<ApiResponse<TemplatePlaceholder[]>> => {
    return fetchWithAuth<TemplatePlaceholder[]>('/api/v1/report-templates/placeholders');
  },

  getSections: async (): Promise<ApiResponse<TemplateSection[]>> => {
    return fetchWithAuth<TemplateSection[]>('/api/v1/report-templates/sections');
  },

  renderPreview: async (request: RenderPreviewRequest): Promise<ApiResponse<string>> => {
    return fetchWithAuth<string>('/api/v1/report-templates/preview', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// ============== Route Queue API ==============
export const routeQueueApi = {
  getQueue: async (params: RouteQueueSearchParams = {}): Promise<ApiResponse<PagedResponse<RouteQueueItem>>> => {
    const qs = buildQueryString(params as Record<string, unknown>);
    return fetchWithAuth<PagedResponse<RouteQueueItem>>(`/api/v1/route-queue${qs}`);
  },

  getErrors: async (params: RouteQueueSearchParams = {}): Promise<ApiResponse<PagedResponse<RouteError>>> => {
    const qs = buildQueryString(params as Record<string, unknown>);
    return fetchWithAuth<PagedResponse<RouteError>>(`/api/v1/route-queue/errors${qs}`);
  },

  getHistory: async (params: RouteHistorySearchParams = {}): Promise<ApiResponse<PagedResponse<RouteHistoryItem>>> => {
    const qs = buildQueryString(params as Record<string, unknown>);
    return fetchWithAuth<PagedResponse<RouteHistoryItem>>(`/api/v1/route-queue/history${qs}`);
  },

  getSummary: async (): Promise<ApiResponse<QueueSummaryResponse>> => {
    return fetchWithAuth<QueueSummaryResponse>('/api/v1/route-queue/summary');
  },

  deleteQueueItem: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/route-queue/${id}`, { method: 'DELETE' });
  },

  deleteQueueByDestination: async (destinationId: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/route-queue/destination/${destinationId}`, { method: 'DELETE' });
  },

  retryError: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/route-queue/retry/${id}`, { method: 'POST' });
  },

  retryAllErrors: async (destinationId: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/route-queue/retry-all/${destinationId}`, { method: 'POST' });
  },

  clearErrors: async (destinationId: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/route-queue/errors/${destinationId}`, { method: 'DELETE' });
  },

  queueStudy: async (request: QueueStudyRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/route-queue/study', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  queueSeries: async (request: QueueSeriesRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/route-queue/series', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },
};

// ============== External Tools API ==============
export const externalToolsApi = {
  list: async (): Promise<ApiResponse<ExternalTool[]>> => {
    return fetchWithAuth<ExternalTool[]>('/api/v1/external-tools');
  },

  create: async (request: CreateExternalToolRequest): Promise<ApiResponse<ExternalTool>> => {
    return fetchWithAuth<ExternalTool>('/api/v1/external-tools', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: string, request: UpdateExternalToolRequest): Promise<ApiResponse<ExternalTool>> => {
    return fetchWithAuth<ExternalTool>(`/api/v1/external-tools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/external-tools/${id}`, { method: 'DELETE' });
  },

  reorder: async (request: ReorderExternalToolsRequest): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>('/api/v1/external-tools/reorder', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  launch: async (id: string): Promise<ApiResponse<ExternalTool>> => {
    return fetchWithAuth<ExternalTool>(`/api/v1/external-tools/${id}/launch`, { method: 'POST' });
  },
};

// ============== Physicians API ==============
export const physicianApi = {
  search: async (q?: string, limit = 20): Promise<ApiResponse<Physician[]>> => {
    const qs = buildQueryString({ q, limit });
    return fetchWithAuth<Physician[]>(`/api/v1/physicians${qs}`);
  },

  getById: async (id: number): Promise<ApiResponse<Physician>> => {
    return fetchWithAuth<Physician>(`/api/v1/physicians/${id}`);
  },
};

// ============== Services Monitor API ==============
export const servicesMonitorApi = {
  getSnapshot: async (): Promise<ApiResponse<ServicesSnapshot>> => {
    return fetchWithAuth<ServicesSnapshot>('/api/v1/services-monitor');
  },

  control: async (name: string, action: ServiceAction): Promise<ApiResponse<ServiceInfo>> => {
    return fetchWithAuth<ServiceInfo>(
      `/api/v1/services-monitor/${encodeURIComponent(name)}/${action}`,
      { method: 'POST' }
    );
  },
};
