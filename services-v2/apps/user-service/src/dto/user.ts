import {PageableRequestFilter} from '@opn/common/dto'
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
