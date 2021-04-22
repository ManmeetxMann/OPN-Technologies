import {PageableRequestFilter} from '@opn-services/common/dto'
import {ApiModelPropertyOptional} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'

export type LocationUpdateRequest = {
  title: string
  streetAddress: string
  city: string
  zip: string
  state: string
  country: string
}
export class LocationFilter extends PageableRequestFilter {
  @ApiModelPropertyOptional()
  organizationId?: string
}
