import {PageableRequestFilter} from '@opn-services/common/dto'
import {ApiModelPropertyOptional} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'

export type GroupCreateRequest = GroupUpdateRequest & {
  organizationId: string
}
export type GroupUpdateRequest = {
  name: string
  priority: number
}
export class GroupFilter extends PageableRequestFilter {
  @ApiModelPropertyOptional()
  organizationId?: string
}
