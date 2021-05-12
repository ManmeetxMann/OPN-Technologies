export enum RequiredUserPermission {
  SuperAdmin = 'SuperAdmin',
  OPNAdmin = 'OPNAdmin',
  OrgAdmin = 'OrgAdmin',
  RegUser = 'RegUser',
  LabAppointments = 'LabAppointments',
  LabOrOrgAppointments = 'LabOrOrgAppointments',
  LabPCRTestResults = 'LabPCRTestResults',
  LabReceiving = 'LabReceiving',
  LabTransportRunsCreate = 'LabTransportRunsCreate',
  LabTransportRunsList = 'LabTransportRunsList',
  LabTestRunsCreate = 'LabTestRunsCreate',
  LabTestRunsList = 'LabTestRunsList',
  LabSendBulkResults = 'LabSendBulkResults',
  LabSendSingleResults = 'LabSendSingleResults',
  LabDueToday = 'LabDueToday',
  LabConfirmResults = 'LabConfirmResults',
  AdminScanHistory = 'AdminScanHistory',
  AllowCheckIn = 'AllowCheckIn',
  ClinicRapidResultSenderAdmin = 'ClinicRapidResultSenderAdmin',
  TestKitBatchAdmin = 'TestKitBatchAdmin',
  GenerateBarCodeAdmin = 'GenerateBarCodeAdmin',
  LookupAdmin = 'LookupAdmin',
}

export type RolesData = {
  requiredRoles?: RequiredUserPermission[]
  requireOrg: boolean
}

export enum InternalAuthTypes {
  OpnSchedulerKey = 'OpnSchedulerKey',
}

export enum OpnSources {
  FH_IOS = 'FH_IOS',
  FH_Android = 'FH_Android',
  OPN_IOS = 'OPN_IOS',
  OPN_Android = 'OPN_Android',
  Admin_Dashboard = 'Admin_Dashboard',
  FH_RapidHome_Web = 'FH_RapidHome_Web',
}

export enum OpnLang {
  en = 'en',
  fr = 'fr',
}

export type OpnCommonHeaders = {
  opnDeviceIdHeader: string
  opnSourceHeader: OpnSources
  opnRequestIdHeader: string
  opnLangHeader: OpnLang
  opnAppVersion: string
}

export enum OpnRawHeaders {
  OpnDeviceId = 'opn-device-id',
  OpnSource = 'opn-source',
  OpnRequestId = 'opn-request-id',
  OpnLang = 'opn-lang',
  OpnAppVersion = 'opn-app-version',
}
