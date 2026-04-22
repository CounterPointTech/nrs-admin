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

// ============== Connection ==============
export interface ConnectionStatusResponse {
  isConfigured: boolean;
  isConnected: boolean;
  serverVersion?: string;
  databaseName?: string;
  host?: string;
}

export interface ConnectionSettingsResponse {
  database: DatabaseSettingsResponse;
  mappingFile: MappingFileSettingsResponse;
  reportTemplate: ReportTemplateSettingsResponse;
  novaradServer: NovaradServerSettingsResponse;
}

export interface NovaradServerSettingsResponse {
  host: string;
}

export interface DatabaseSettingsResponse {
  host: string;
  port: number;
  database: string;
  username: string;
  timeout: number;
}

export interface MappingFileSettingsResponse {
  path: string;
  backupDirectory: string;
}

export interface ReportTemplateSettingsResponse {
  directory: string;
  backupDirectory: string;
}

export interface SaveConnectionRequest {
  database?: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    timeout: number;
  };
  mappingFile?: {
    path: string;
    backupDirectory: string;
  };
  reportTemplate?: {
    directory: string;
    backupDirectory: string;
  };
  novaradServer?: {
    host: string;
  };
}

export interface TestConnectionRequest {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  timeout: number;
}

export interface TestConnectionResponse {
  success: boolean;
  serverVersion?: string;
  isNovaradDatabase: boolean;
  errorMessage?: string;
}

export interface TestPathResponse {
  exists: boolean;
  isAccessible: boolean;
  errorMessage?: string;
}

export interface BrowseResponse {
  currentPath: string;
  parent?: string;
  entries: BrowseEntry[];
}

export interface BrowseEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
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
  patientGroup?: string;
  priority: number;
  modifiedDate: string;
  firstProcessedDate?: string;
  lastImageProcessedDate?: string;
}

export interface UpdateStudyRequest {
  status?: number;
  comments?: string;
  priority?: number;
  facilityId?: number;
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

export interface PatientGroup {
  patientGroupId: number;
  name: string;
  description?: string;
  isDefault: boolean;
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
  totalImages: number;
  activeUsers: number;
  activeServices: number;
  totalPatients: number;
  modalityBreakdown: ModalityBreakdown[];
  facilityBreakdown: FacilityBreakdown[];
  recentStudies: RecentStudy[];
}

export interface ModalityBreakdown {
  modality: string;
  studyCount: number;
  imageCount: number;
  seriesCount: number;
  patientCount: number;
}

export interface FacilityBreakdown {
  facilityId: number;
  facilityName: string;
  studyCount: number;
  patientCount: number;
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

export type SettingSource =
  | 'shared'
  | 'site'
  | 'pacs'
  | 'ris'
  | 'object_store'
  | 'pacs_options'
  | 'ris_options';

export interface UnifiedSetting {
  name: string;
  value?: string;
  source: SettingSource;
  sourceLabel: string;
  usingDefault?: boolean;
  lastUpdateDate?: string;
  createdOnDate?: string;
}

export interface SettingsOverview {
  total: number;
  sources: SourceCount[];
}

export interface SourceCount {
  source: SettingSource;
  sourceLabel: string;
  count: number;
}

// ============== PACS Destinations ==============
export interface PacsDestination {
  destinationId: number;
  name: string;
  address: string;
  aeTitle: string;
  port: number;
  type: number;
  password?: string;
  numTries: number;
  frequency: number;
  compression: number;
  status: number;
  routeRelated: boolean;
  transferSyntax: string;
  routingZone?: number;
  routingZoneName?: string;
}

export interface CreatePacsDestinationRequest {
  name: string;
  address: string;
  aeTitle: string;
  port: number;
  type: number;
  password?: string;
  numTries: number;
  frequency: number;
  compression: number;
  status: number;
  routeRelated: boolean;
  transferSyntax: string;
  routingZone?: number;
}

export interface UpdatePacsDestinationRequest extends CreatePacsDestinationRequest {}

// Destination type labels (DICOM destination types)
export const DESTINATION_TYPE_LABELS: Record<number, string> = {
  0: 'DICOM',
  1: 'HL7',
  2: 'Web',
  3: 'Media',
};

export function getDestinationTypeLabel(type: number): string {
  return DESTINATION_TYPE_LABELS[type] ?? `Type ${type}`;
}

// Destination status labels
export const DESTINATION_STATUS_LABELS: Record<number, string> = {
  0: 'Active',
  1: 'Disabled',
  2: 'Error',
};

export function getDestinationStatusLabel(status: number): string {
  return DESTINATION_STATUS_LABELS[status] ?? `Status ${status}`;
}

// ============== Route History ==============
export interface RouteHistoryEntry {
  id: number;
  destinationId: number;
  dataset: number;
  timeSent: string;
  overwriteExisting: boolean;
  destinationName?: string;
}

// ============== Routing Zones ==============
export interface RoutingZone {
  id: number;
  zoneName: string;
  isDefault: boolean;
}

export interface CreateRoutingZoneRequest {
  zoneName: string;
  isDefault: boolean;
}

export interface UpdateRoutingZoneRequest extends CreateRoutingZoneRequest {}

// ============== Billing / CPT Codes ==============
export interface BillingServiceCode {
  serviceCodeId: number;
  serviceCode: string;
  description?: string;
  modalityType?: string;
  rvuWork?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface CreateCptCodeRequest {
  serviceCode: string;
  description?: string;
  modalityType?: string;
  rvuWork?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface UpdateCptCodeRequest extends CreateCptCodeRequest {}

export interface CptCodeSearchFilters {
  search?: string;
  modalityType?: string;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface CptImportRow {
  serviceCode: string;
  description?: string;
  modalityType?: string;
  rvuWork?: number;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface CptImportPreviewRow {
  rowNumber: number;
  data: CptImportRow;
  isValid: boolean;
  isDuplicate: boolean;
  errors: string[];
}

export interface CptImportPreviewResponse {
  totalRows: number;
  validRows: number;
  errorRows: number;
  duplicateRows: number;
  rows: CptImportPreviewRow[];
}

export interface CptImportExecuteRequest {
  rows: CptImportRow[];
  overwriteExisting: boolean;
}

export interface CptImportExecuteResponse {
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: string[];
}

// ============== ICD Codes ==============
export interface IcdCode {
  icdCodeId: string;
  description?: string;
  subCategoryId?: number;
  icdCodeVersion: number;
  icdCodeDisplay: string;
  obsoleteDate?: string;
  categoryName?: string;
}

export interface IcdCategory {
  icdCategoryId: number;
  parentId?: number;
  description: string;
  version: number;
  first?: string;
  last?: string;
}

export interface CreateIcdCodeRequest {
  icdCodeId: string;
  description?: string;
  subCategoryId?: number;
  icdCodeVersion: number;
  icdCodeDisplay: string;
}

export interface UpdateIcdCodeRequest {
  description?: string;
  subCategoryId?: number;
  icdCodeVersion: number;
  icdCodeDisplay: string;
}

export interface IcdCodeSearchFilters {
  search?: string;
  version?: number;
  categoryId?: number;
  includeObsolete?: boolean;
  sortBy?: string;
  sortDesc?: boolean;
}

// ============== Report Templates ==============
export interface ReportTemplateInfo {
  name: string;
  sizeBytes: number;
  lastModifiedUtc: string;
  usedByFacilities: string[];
}

export interface ReportTemplateBackup {
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  originalTemplate: string;
}

export interface TemplatePlaceholder {
  name: string;
  tag: string;
  description: string;
  category: string;
  sampleValue: string;
}

export interface TemplateSection {
  name: string;
  startTag: string;
  endTag: string;
  description: string;
}

export interface SaveReportTemplateRequest {
  content: string;
}

export interface CreateReportTemplateRequest {
  name: string;
  content: string;
}

export interface DuplicateReportTemplateRequest {
  newName: string;
}

export interface RenderPreviewRequest {
  content: string;
}

// ============== RIS / Unified Study ==============

export type LinkMethod = 'None' | 'Accession' | 'StudyUid' | 'Both';

export interface StudyRisLink {
  linkMethod: LinkMethod;
  orderId?: number;
  accessionNumber?: string;
  studyUid?: string;
}

export interface RisOrder {
  orderId: number;
  patientId: string;
  siteCode: string;
  status?: string;
  accessionNumber?: string;
  description?: string;
  patientComplaint?: string;
  physicianReason?: string;
  notes?: string;
  referringPhysicianId?: number;
  referringPhysicianName?: string;
  consultingPhysicians?: string;
  patientWeight?: number;
  creationDate?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  siteName?: string;
}

export interface RisOrderProcedure {
  procedureId: number;
  orderId: number;
  studyUid?: string;
  status?: string;
  procedureName?: string;
  modalityId?: number;
  modalityName?: string;
  modalityType?: string;
  assignedPhysicianId?: number;
  assignedPhysicianName?: string;
  statFlag: boolean;
  notes?: string;
  schedulerNotes?: string;
  patientClass?: string;
  patientLocation?: string;
  visitNumber?: string;
  procedureDateStart?: string;
  procedureDateEnd?: string;
  checkInTime?: string;
  creationDate?: string;
  modifiedDate?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  steps: RisProcedureStep[];
}

export interface RisProcedureStep {
  procedureId: number;
  stepNumber: number;
  status?: string;
  description?: string;
  completionDate?: string;
  completedByUserId?: number;
  isDisabled: boolean;
}

export interface RisReport {
  reportId: number;
  procedureId: number;
  reportType: string;
  status?: string;
  reportText?: string;
  reportFormat?: string;
  requiresCorrection: boolean;
  signedDate?: string;
  transcribedDate?: string;
  signingPhysicianId?: number;
  signingPhysicianName?: string;
  reportingPhysicianId?: number;
  reportingPhysicianName?: string;
  creationDate?: string;
  notes?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface StandardReport {
  standardReportId: number;
  shortReportName: string;
  reportText: string;
  createdBy?: string;
}

export interface MergeOrdersRequest {
  targetOrderId: number;
  sourceOrderId: number;
  fieldOverrides?: Record<string, string | null>;
}

export interface MergeProceduresRequest {
  targetProcedureId: number;
  sourceProcedureId: number;
  moveReports?: boolean;
  fieldOverrides?: Record<string, string | null>;
}

export interface PatientDeletionPreview {
  patientId: string;
  siteCode: string;
  personId: number;
  orderCount: number;
  insuranceReferences: number;
  billingAccountCount: number;
  documentCount: number;
  canDelete: boolean;
  blockingReason?: string;
}

export interface CreateStandardReportRequest {
  shortReportName: string;
  reportText: string;
  createdBy?: string;
}

export interface RisPatientDemographics {
  patientId: string;
  siteCode: string;
  personId: number;
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  dateOfBirth?: string;
  sex?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  homePhone?: string;
  workPhone?: string;
  mobilePhone?: string;
  email?: string;
  healthNumber?: string;
  notes?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface DiscrepancyField {
  fieldName: string;
  pacsValue?: string;
  risValue?: string;
}

export interface PatientComparison {
  pacsPatientId: string;
  pacsFirstName?: string;
  pacsLastName?: string;
  pacsMiddleName?: string;
  pacsGender?: string;
  pacsBirthTime?: string;
  risPatientId?: string;
  risFirstName?: string;
  risLastName?: string;
  risMiddleInitial?: string;
  risSex?: string;
  risDateOfBirth?: string;
  discrepancies: DiscrepancyField[];
}

export interface OrderComparison {
  pacsAccession?: string;
  pacsStudyUid?: string;
  pacsStudyDate?: string;
  pacsModality?: string;
  pacsStudyDescription?: string;
  pacsFacility?: string;
  risAccession?: string;
  risStudyUid?: string;
  risProcedureDate?: string;
  risModality?: string;
  risDescription?: string;
  risFacility?: string;
  discrepancies: DiscrepancyField[];
}

export interface UnifiedStudyDetail {
  study: StudyDetail;
  link: StudyRisLink;
  patientComparison: PatientComparison;
  orderComparison: OrderComparison;
  orders: RisOrder[];
  procedures: RisOrderProcedure[];
  reports: RisReport[];
  risPatient?: RisPatientDemographics;
}

// RIS edit request types
export interface UpdateRisOrderRequest {
  description?: string;
  notes?: string;
  patientComplaint?: string;
  physicianReason?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  customField4?: string;
  siteCode?: string;
}

export interface UpdateRisOrderProcedureRequest {
  notes?: string;
  schedulerNotes?: string;
  customField1?: string;
  customField2?: string;
  customField3?: string;
  assignedPhysicianId?: number | null;
  patientClass?: string;
  patientLocation?: string;
  visitNumber?: string;
  checkInTime?: string | null;
  procedureDateStart?: string | null;
  procedureDateEnd?: string | null;
  statFlag?: boolean;
}

export interface Physician {
  id: number;
  displayName: string;
  specialty?: string;
  npi?: string;
}

export interface Site {
  siteId: number;
  siteCode: string;
  description?: string;
  isDefault: boolean;
}

export interface UpdateSeriesRequest {
  modality?: string;
  description?: string;
}

export interface UpdateRisReportRequest {
  reportText?: string;
  reportFormat?: string;
  notes?: string;
  status?: string;
  reportType?: string;
  requiresCorrection?: boolean;
  customField1?: string;
  customField2?: string;
  customField3?: string;
}

export interface CreateRisReportRequest {
  procedureId: number;
  reportType: string;
  status?: string;
  reportText?: string;
  reportFormat?: string;
  notes?: string;
}

export interface UpdateRisPatientDetailsRequest {
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  homePhone?: string;
  workPhone?: string;
  mobilePhone?: string;
  email?: string;
  healthNumber?: string;
  emergencyContact?: string;
  emergencyContactPhone?: string;
  notes?: string;
}

export interface LinkStudyRequest {
  orderId: number;
}

export interface PatientMergeRequest {
  targetPatientId: string;
  targetSiteCode: string;
  sourcePatientId: string;
  sourceSiteCode: string;
  moveOrders: boolean;
  moveDocuments: boolean;
}

export interface SearchRisOrdersFilters {
  accessionNumber?: string;
  patientId?: string;
  patientName?: string;
  dateFrom?: string;
  dateTo?: string;
}

export type SyncTarget = 'Pacs' | 'Ris' | 'Both';

export interface SyncFieldRequest {
  fieldName: string;
  value?: string;
  target: SyncTarget;
}

// ==================== Route Queue ====================

export interface RouteQueueItem {
  id: number;
  destinationId: number;
  dataset: number;
  timeQueued: string;
  priority: number;
  status: number;
  nextTryTime: string | null;
  remainingTries: number;
  overwriteExisting: boolean;
  destinationName: string | null;
  studyUid: string | null;
  patientName: string | null;
  patientId: string | null;
  modality: string | null;
  seriesDescription: string | null;
}

export interface RouteError {
  id: number;
  destinationId: number;
  dataset: number;
  timeQueued: string;
  priority: number;
  error: string;
  lastTryTime: string;
  overwriteExisting: boolean;
  destinationName: string | null;
  studyUid: string | null;
  patientName: string | null;
  patientId: string | null;
  modality: string | null;
  seriesDescription: string | null;
}

export interface RouteHistoryItem {
  id: number;
  destinationId: number;
  dataset: number;
  timeSent: string;
  overwriteExisting: boolean;
  destinationName: string | null;
  studyUid: string | null;
  patientName: string | null;
  patientId: string | null;
  modality: string | null;
  seriesDescription: string | null;
}

export interface QueueSummary {
  destinationId: number;
  destinationName: string;
  pendingCount: number;
  errorCount: number;
  completedToday: number;
}

export interface QueueSummaryResponse {
  destinations: QueueSummary[];
  totals: {
    pending: number;
    errors: number;
    completedToday: number;
  };
}

export interface RouteQueueSearchParams {
  destinationId?: number;
  status?: number;
  priority?: number;
  patientName?: string;
  studyUid?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface RouteHistorySearchParams {
  destinationId?: number;
  patientName?: string;
  studyUid?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDesc?: boolean;
}

export interface QueueStudyRequest {
  studyUid: string;
  destinationId: number;
  priority?: number;
  overwriteExisting?: boolean;
}

export interface QueueSeriesRequest {
  seriesUid: string;
  destinationId: number;
  priority?: number;
  overwriteExisting?: boolean;
}

// ============== External Tools ==============

export type ExternalToolType = 'Url' | 'Executable' | 'Command' | 'FileOrFolder';

export type ExternalToolShell = 'Default' | 'Cmd' | 'PowerShell' | 'PwshCore';

export interface ExternalTool {
  id: string;
  name: string;
  description?: string;
  type: ExternalToolType;
  target: string;
  arguments?: string;
  workingDirectory?: string;
  iconName?: string;
  category?: string;
  sortOrder: number;
  shell: ExternalToolShell;
  runAsAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExternalToolRequest {
  name: string;
  description?: string;
  type: ExternalToolType;
  target: string;
  arguments?: string;
  workingDirectory?: string;
  iconName?: string;
  category?: string;
  sortOrder: number;
  shell: ExternalToolShell;
  runAsAdmin: boolean;
}

export type UpdateExternalToolRequest = CreateExternalToolRequest;

export interface ReorderExternalToolsRequest {
  items: { id: string; sortOrder: number }[];
}

// ============== Services Monitor ==============

export type ServiceStatus =
  | 'Running'
  | 'Stopped'
  | 'StartPending'
  | 'StopPending'
  | 'Paused'
  | 'PausePending'
  | 'ContinuePending'
  | 'Unknown';

export interface ServiceInfo {
  name: string;
  displayName: string;
  status: ServiceStatus | string;
  canStop: boolean;
  canPauseAndContinue: boolean;
}

export interface ServicesSnapshot {
  host: string;
  remote: boolean;
  checkedAt: string;
  services: ServiceInfo[];
  error?: string;
}

export type ServiceAction = 'start' | 'stop' | 'restart';
