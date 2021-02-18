export enum BulkOperationStatus {
  Success = 'Success',
  Failed = 'Failed',
}

export type BulkOperationResponse = {
  id: string
  barCode?: string
  status: BulkOperationStatus
  reason?: string
}
