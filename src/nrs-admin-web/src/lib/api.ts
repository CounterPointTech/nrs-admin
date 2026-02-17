import {
  ApiResponse,
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
  Series,
  Dataset,
  PagedResponse,
  DashboardStats,
  SharedSetting,
  SiteSetting,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

  update: async (id: number, data: Partial<StudyDetail>): Promise<ApiResponse<StudyDetail>> => {
    return fetchWithAuth<StudyDetail>(`/api/v1/studies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
