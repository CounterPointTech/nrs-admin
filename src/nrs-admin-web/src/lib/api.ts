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
  Hl7Location,
  Hl7LocationOption,
  CreateHl7LocationRequest,
  UpdateHl7LocationRequest,
  SaveHl7LocationOptionRequest,
  Hl7MessageDestination,
  Hl7DistributionRule,
  CreateHl7DestinationRequest,
  UpdateHl7DestinationRequest,
  CreateHl7DistributionRuleRequest,
  UpdateHl7DistributionRuleRequest,
  Hl7FieldMapping,
  CreateHl7FieldMappingRequest,
  UpdateHl7FieldMappingRequest,
  Hl7MessageForwarding,
  CreateHl7ForwardingRequest,
  UpdateHl7ForwardingRequest,
  PacsDestination,
  CreatePacsDestinationRequest,
  UpdatePacsDestinationRequest,
  RouteHistoryEntry,
  RoutingZone,
  CreateRoutingZoneRequest,
  UpdateRoutingZoneRequest,
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
    if (response.status === 401 && tokens.refreshToken) {
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

async function refreshAccessToken(): Promise<boolean> {
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
      clearTokens();
      return false;
    }

    const result: ApiResponse<LoginResponse> = await response.json();
    if (result.success && result.data) {
      setTokens(result.data.accessToken, result.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    clearTokens();
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
};

// ============== HL7 Locations API ==============
export const hl7LocationApi = {
  getAll: async (): Promise<ApiResponse<Hl7Location[]>> => {
    return fetchWithAuth<Hl7Location[]>('/api/v1/hl7/locations');
  },

  getById: async (id: number): Promise<ApiResponse<Hl7Location>> => {
    return fetchWithAuth<Hl7Location>(`/api/v1/hl7/locations/${id}`);
  },

  create: async (request: CreateHl7LocationRequest): Promise<ApiResponse<Hl7Location>> => {
    return fetchWithAuth<Hl7Location>('/api/v1/hl7/locations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateHl7LocationRequest): Promise<ApiResponse<Hl7Location>> => {
    return fetchWithAuth<Hl7Location>(`/api/v1/hl7/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/locations/${id}`, { method: 'DELETE' });
  },

  getOptions: async (locationId: number): Promise<ApiResponse<Hl7LocationOption[]>> => {
    return fetchWithAuth<Hl7LocationOption[]>(`/api/v1/hl7/locations/${locationId}/options`);
  },

  upsertOption: async (locationId: number, request: SaveHl7LocationOptionRequest): Promise<ApiResponse<Hl7LocationOption>> => {
    return fetchWithAuth<Hl7LocationOption>(`/api/v1/hl7/locations/${locationId}/options`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  deleteOption: async (locationId: number, name: string): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/locations/${locationId}/options/${encodeURIComponent(name)}`, {
      method: 'DELETE',
    });
  },
};

// ============== HL7 Destinations API ==============
export const hl7DestinationApi = {
  getAll: async (): Promise<ApiResponse<Hl7MessageDestination[]>> => {
    return fetchWithAuth<Hl7MessageDestination[]>('/api/v1/hl7/destinations');
  },

  getById: async (id: number): Promise<ApiResponse<Hl7MessageDestination>> => {
    return fetchWithAuth<Hl7MessageDestination>(`/api/v1/hl7/destinations/${id}`);
  },

  create: async (request: CreateHl7DestinationRequest): Promise<ApiResponse<Hl7MessageDestination>> => {
    return fetchWithAuth<Hl7MessageDestination>('/api/v1/hl7/destinations', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateHl7DestinationRequest): Promise<ApiResponse<Hl7MessageDestination>> => {
    return fetchWithAuth<Hl7MessageDestination>(`/api/v1/hl7/destinations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/destinations/${id}`, { method: 'DELETE' });
  },

  getRules: async (destinationId: number): Promise<ApiResponse<Hl7DistributionRule[]>> => {
    return fetchWithAuth<Hl7DistributionRule[]>(`/api/v1/hl7/destinations/${destinationId}/rules`);
  },

  getAllRules: async (): Promise<ApiResponse<Hl7DistributionRule[]>> => {
    return fetchWithAuth<Hl7DistributionRule[]>('/api/v1/hl7/destinations/rules');
  },

  createRule: async (request: CreateHl7DistributionRuleRequest): Promise<ApiResponse<Hl7DistributionRule>> => {
    return fetchWithAuth<Hl7DistributionRule>('/api/v1/hl7/destinations/rules', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  updateRule: async (id: number, request: UpdateHl7DistributionRuleRequest): Promise<ApiResponse<Hl7DistributionRule>> => {
    return fetchWithAuth<Hl7DistributionRule>(`/api/v1/hl7/destinations/rules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  deleteRule: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/destinations/rules/${id}`, { method: 'DELETE' });
  },
};

// ============== HL7 Field Mapping API ==============
export const hl7FieldMappingApi = {
  getAll: async (messageType?: string, locationId?: string): Promise<ApiResponse<Hl7FieldMapping[]>> => {
    return fetchWithAuth<Hl7FieldMapping[]>(
      `/api/v1/hl7/field-mapping${buildQueryString({ messageType, locationId })}`
    );
  },

  getById: async (id: number): Promise<ApiResponse<Hl7FieldMapping>> => {
    return fetchWithAuth<Hl7FieldMapping>(`/api/v1/hl7/field-mapping/${id}`);
  },

  getMessageTypes: async (): Promise<ApiResponse<string[]>> => {
    return fetchWithAuth<string[]>('/api/v1/hl7/field-mapping/message-types');
  },

  getLocations: async (): Promise<ApiResponse<(string | null)[]>> => {
    return fetchWithAuth<(string | null)[]>('/api/v1/hl7/field-mapping/locations');
  },

  create: async (request: CreateHl7FieldMappingRequest): Promise<ApiResponse<Hl7FieldMapping>> => {
    return fetchWithAuth<Hl7FieldMapping>('/api/v1/hl7/field-mapping', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateHl7FieldMappingRequest): Promise<ApiResponse<Hl7FieldMapping>> => {
    return fetchWithAuth<Hl7FieldMapping>(`/api/v1/hl7/field-mapping/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/field-mapping/${id}`, { method: 'DELETE' });
  },
};

// ============== HL7 Forwarding API ==============
export const hl7ForwardingApi = {
  getAll: async (): Promise<ApiResponse<Hl7MessageForwarding[]>> => {
    return fetchWithAuth<Hl7MessageForwarding[]>('/api/v1/hl7/forwarding');
  },

  getById: async (id: number): Promise<ApiResponse<Hl7MessageForwarding>> => {
    return fetchWithAuth<Hl7MessageForwarding>(`/api/v1/hl7/forwarding/${id}`);
  },

  create: async (request: CreateHl7ForwardingRequest): Promise<ApiResponse<Hl7MessageForwarding>> => {
    return fetchWithAuth<Hl7MessageForwarding>('/api/v1/hl7/forwarding', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  update: async (id: number, request: UpdateHl7ForwardingRequest): Promise<ApiResponse<Hl7MessageForwarding>> => {
    return fetchWithAuth<Hl7MessageForwarding>(`/api/v1/hl7/forwarding/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  },

  delete: async (id: number): Promise<ApiResponse<void>> => {
    return fetchWithAuth<void>(`/api/v1/hl7/forwarding/${id}`, { method: 'DELETE' });
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
