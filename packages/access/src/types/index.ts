import {Range} from '../../../common/src/types/range'

export type AccessFilterWithDependent = {
  userId: string
  dependentId?: string
  locationId?: string
  betweenCreatedDate?: Range<Date>
}
