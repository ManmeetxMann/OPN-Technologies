import {User} from '@opn-common-v1/data/user'

export interface AuthUser extends User {
  authUserId?: string

  stripeCustomerId?: string

  requestOrganizationId?: string
  requestLabId?: string
}
