export enum BulkOperationStatus {
  Success = 'success',
  NotFound = 'not found',
  NotAppropriate = 'not appropriate',
  InternalError = 'internal error',
}

export type BulkOperationResponse = {
  id: string
  status: BulkOperationStatus
  message?: string
}
