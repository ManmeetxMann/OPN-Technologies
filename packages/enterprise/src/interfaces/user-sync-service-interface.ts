import {UpdateUserByAdminRequest, UpdateUserRequest} from '../types/update-user-request'
import {NewSyncUser} from '../types/new-user'

export interface UserSyncServiceInterface {
  create(source: NewSyncUser): Promise<void>
  update(firebaseKey: string, source: UpdateUserRequest): Promise<void>
  updateByAdmin(firebaseKey: string, source: UpdateUserByAdminRequest): Promise<void>
}
