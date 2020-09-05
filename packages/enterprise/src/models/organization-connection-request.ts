import {User} from '../../../common/src/data/user'

export type OrganizationConnectionRequest = User & {
  key: number
  groupId: string
}
