import {User} from '../../../common/src/data/user'

export type OrganizationConnectionRequest = User & {
  organizationId: number
  groupId: string
  idToken?: string
}
