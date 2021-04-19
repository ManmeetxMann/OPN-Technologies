import {Auditable} from '@opn-services/common/model'

export class Access extends Auditable {
  token: string
  locationId: string
  userId: string
  enteredAt: Date
  exitedAt: Date
}
