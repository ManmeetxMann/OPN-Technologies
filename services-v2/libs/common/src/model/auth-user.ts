import {User} from '../../../../../packages/common/src/data/user'
export interface AuthUser extends User {
  authUserId?: string

  stripeCustomerId?: string

  requestOrganizationId?: string
  requestLabId?: string
}
