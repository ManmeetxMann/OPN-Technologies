import {Phone} from '../../../common/src/types/phone'

export type UpdateUserRequest = {
  firstName: string
  lastName: string
  photo?: string //url
}

export type UpdateUserByAdminRequest = {
  firstName: string
  lastName: string
  registrationId?: string
  photo?: string //url
  phone?: Phone
  memberId?: string
  groupId?: string
  organizationId?: string
}
