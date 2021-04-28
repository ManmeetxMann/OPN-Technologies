import {PageableRequestFilter} from '@opn-services/common/dto'
import {
  ApiModelProperty,
  ApiModelPropertyOptional,
} from '@nestjs/swagger/dist/decorators/api-model-property.decorator'

export class UserFilter extends PageableRequestFilter {
  @ApiModelProperty()
  organizationId: string

  @ApiModelPropertyOptional()
  groupId?: string = null
}
