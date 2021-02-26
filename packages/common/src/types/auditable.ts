import {Timestamp} from './timestamp'

export type Auditable = {
  timestamps: Timestamp
  updatedBy: string //TODO: handle with authenticated userId
}
