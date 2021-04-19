import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  NotFoundException,
  Query,
  UseGuards
} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard/auth.guard'

@ApiTags('Cart')
@Controller('/api/v1/cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor() {}

  @Get()
  async getAll(): Promise<ResponseWrapper<unknown>> {
    // @Query() filter: PatientFilter

    // const {data, page, totalItems, totalPages} = await this.patientService.getAll(
    //   assignWithoutUndefined(filter, new PatientFilter()),
    // )

    return ResponseWrapper.actionSucceed({})
  }
}
