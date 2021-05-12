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

export enum OpnSources {
  OPN = 'OPN',
  FHHealth = 'FHHealth',
}
