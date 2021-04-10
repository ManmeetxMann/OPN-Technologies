import {Controller} from '@nestjs/common'
import {ApiBearerAuth} from '@nestjs/swagger';

@Controller('/api/v1/users')
@ApiBearerAuth('JWT')
export class PublicV1UserController {}
