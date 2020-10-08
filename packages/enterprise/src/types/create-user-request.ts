import {Phone} from '../../../common/src/types/phone'

export type CreateUserRequest = {
  email: string
  firstName: string
  lastName: string

  id?: string // Existing user
  photo?: string //url
  phone?: Phone
}
