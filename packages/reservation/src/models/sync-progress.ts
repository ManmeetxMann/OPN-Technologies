export enum SyncInProgressTypes {
  Acuity = 'Acuity',
}

export type SyncProgress = {
  type: SyncInProgressTypes
  key: string
  id: string
}
