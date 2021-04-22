import {Controller, UseGuards} from '@nestjs/common'
import {AuthGuard} from '@opn-services/common/guard/auth.guard'
@Controller('/api/v1/users')
@UseGuards(AuthGuard)
export class PublicV1UserController {}
