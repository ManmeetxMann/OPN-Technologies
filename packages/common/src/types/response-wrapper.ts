import {ResponseStatus} from './response-status'

export type ResponseWrapper<T> = {
  data: T
  status: ResponseStatus
  page?: number
  totalPages?: number
  totalItems?: number
}
