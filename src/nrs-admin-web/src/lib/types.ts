// ============== API Response Types ==============
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ============== Auth ==============
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserInfo;
}

export interface RefreshRequest {
  accessToken: string;
  refreshToken: string;
}

export interface UserInfo {
  userId: number;
  username: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  roles: string[];
}

// ============== Facility ==============
export interface Facility {
  facilityId: number;
  name: string;
  description?: string;
  isDefault: boolean;
}

// ============== Modality ==============
export interface Modality {
  modalityId: number;
  name: string;
  room?: string;
  status?: string;
  modalityTypeId: string;
  isRetired: boolean;
  aeTitle?: string;
  supportsWorklist: boolean;
  supportsMpps: boolean;
  facilityId?: number;
  facilityName?: string;
}

export interface ModalityType {
  modalityTypeId: string;
  description?: string;
}

export interface CreateModalityRequest {
  name: string;
  room?: string;
  modalityTypeId: string;
  aeTitle?: string;
  supportsWorklist: boolean;
  supportsMpps: boolean;
  facilityId: number;
}

export interface UpdateModalityRequest extends CreateModalityRequest {
  status?: string;
  isRetired: boolean;
}

// ============== Mapping File ==============
export interface MappingEntry {
  lineNumber: number;
  modalityAE?: string;
  modalitySN?: string;
  modalityStationName?: string;
  modalityLocation?: string;
  risAE?: string;
  risSN?: string;
  persistStudyUID?: boolean;
  isComment: boolean;
  rawLine?: string;
}

export interface MappingBackup {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
}

// ============== Study ==============
export interface Study {
  id: number;
  studyUid: string;
  studyDate: string;
  accession?: string;
  modality: string;
  status: number;
  studyTags?: string;
  facilityId: number;
  facilityName?: string;
  institution?: string;
  physicianId?: number;
  patientId: string;
  lastName: string;
  firstName: string;
  gender?: string;
  birthTime?: string;
  seriesCount: number;
  imageCount: number;
}

export interface StudyDetail extends Study {
  patientDbId: number;
  middleName?: string;
  isValid: boolean;
  comments?: string;
  physicianName?: string;
  radiologistId?: number;
  radiologistName?: string;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  custom6?: string;
  anatomicalArea?: string;
  priority: number;
  modifiedDate: string;
  firstProcessedDate?: string;
  lastImageProcessedDate?: string;
}

export interface UpdateStudyRequest {
  status?: number;
  comments?: string;
  priority?: number;
  custom1?: string;
  custom2?: string;
  custom3?: string;
  custom4?: string;
  custom5?: string;
  custom6?: string;
}

export interface BulkUpdateStatusRequest {
  studyIds: number[];
  status: number;
}

export interface BulkUpdateResult {
  updatedCount: number;
  requestedCount: number;
}

export interface StudySearchFilters {
  patientName?: string;
  patientId?: string;
  accession?: string;
  modality?: string;
  dateFrom?: string;
  dateTo?: string;
  facilityId?: number;
  status?: number;
  search?: string;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface Series {
  id: number;
  seriesUid: string;
  seriesId?: string;
  modality: string;
  description: string;
  numImages: number;
  manufacturer?: string;
  isKeyImages: boolean;
  modifiedDate: string;
}

export interface Dataset {
  id: number;
  instanceUid: string;
  instanceNumber: number;
  fileSize?: number;
  mimeType?: string;
}

// Study status code mapping
export const STUDY_STATUS_LABELS: Record<number, string> = {
  0: 'New',
  1: 'In Progress',
  2: 'Read',
  3: 'Final',
  4: 'Addendum',
  5: 'Cancelled',
  6: 'On Hold',
  7: 'Stat',
};

export function getStudyStatusLabel(status: number): string {
  return STUDY_STATUS_LABELS[status] ?? `Status ${status}`;
}

// ============== AE Monitor ==============
export interface AeActivity {
  aeTitle: string;
  matchingItems?: string;
  timeStamp: string;
}

// ============== Dashboard ==============
export interface DashboardStats {
  totalStudies: number;
  todayStudies: number;
  activeSessions: number;
  totalPatients: number;
  studiesByStatus: StudyCountByStatus[];
  studiesByModality: StudyCountByModality[];
  studiesByDate: StudyCountByDate[];
  recentStudies: RecentStudy[];
}

export interface StudyCountByStatus {
  status: number;
  label: string;
  count: number;
}

export interface StudyCountByModality {
  modality: string;
  count: number;
}

export interface StudyCountByDate {
  date: string;
  count: number;
}

export interface RecentStudy {
  id: number;
  patientName: string;
  patientId: string;
  modality: string;
  status: number;
  studyDate: string;
  facilityName?: string;
  accession?: string;
}

// ============== Settings ==============
export interface SharedSetting {
  settingId: number;
  name: string;
  value?: string;
  createdOnDate: string;
  lastUpdateDate: string;
  usingDefault: boolean;
}

export interface SiteSetting {
  settingId: number;
  name: string;
  value?: string;
  createdOnDate: string;
  lastUpdateDate: string;
}
