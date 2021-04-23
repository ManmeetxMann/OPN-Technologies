import {Controller, Get, Param, Query, UseGuards} from '@nestjs/common'
import {AuthGuard} from '@opn-services/common/guard'

import {
  assignWithoutUndefined,
  ResponseStatusCodes,
  ResponseWrapper,
} from '@opn-services/common/dto'
import {UserService} from '../../../service/user/user.service'
import {User} from '../../../model/user/user.entity'
import {UserFilter} from '../../../dto/user'

@Controller('/admin/api/v1/users')
@UseGuards(AuthGuard)
export class AdminV1UserController {
  constructor(private userService: UserService) {}

  @Get()
  findAll(@Query() filter: UserFilter): Promise<ResponseWrapper<User[]>> {
    return this.userService
      .findAll(assignWithoutUndefined(filter, new UserFilter()))
      .then(({data, page, totalItems, totalPages}) =>
        ResponseWrapper.of(data, ResponseStatusCodes.Succeed, null, page, totalPages, totalItems),
      )
  }

  @Get('/:userId')
  getOne(@Param('userId') userId: string): Promise<ResponseWrapper<User>> {
    return this.userService.getOne(userId).then(target => ResponseWrapper.actionSucceed(target))
  }
}
