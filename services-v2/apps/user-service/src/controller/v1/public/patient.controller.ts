import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  NotFoundException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthUserDecorator, Roles} from '@opn-services/common/decorator'

import {Patient} from '../../../model/patient/patient.entity'
import {DependantCreateDto, patientProfileDto, PatientUpdateDto} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1/patients')
@UseGuards(AuthGuard)
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Get('/:patientId')
  @Roles([RequiredUserPermission.RegUser])
  async getById(@Param('patientId') id: string): Promise<ResponseWrapper<PatientUpdateDto>> {
    const patient = await this.patientService.getProfilebyId(id)

    if (!patient) {
      throw new NotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Put('/:patientId')
  @Roles([RequiredUserPermission.RegUser])
  async update(
    @Param('patientId') id: string,
    @Body() patientUpdateDto: PatientUpdateDto,
    @AuthUserDecorator() authUser,
  ): Promise<ResponseWrapper> {
    const isResourceOwner = await this.patientService.isResourceOwner(id, authUser.authUserId)
    if (!isResourceOwner) {
      throw new ForbiddenException('Permission not found for this resource')
    }

    const patientExists = await this.patientService.getbyId(id)
    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    await this.patientService.updateProfile(id, patientUpdateDto)

    return ResponseWrapper.actionSucceed()
  }

  @Post('/:patientId/dependant')
  @Roles([RequiredUserPermission.RegUser])
  async addDependents(
    @Param('patientId') delegateId: string,
    @Body() dependantBody: DependantCreateDto,
    @AuthUserDecorator() authUser,
  ): Promise<ResponseWrapper<Patient>> {
    const isResourceOwner = await this.patientService.isResourceOwner(
      delegateId,
      authUser.authUserId,
    )

    if (!isResourceOwner) {
      throw new ForbiddenException('Permission not found for this resource')
    }

    const delegateExists = await this.patientService.getbyId(delegateId)
    if (!delegateExists) {
      throw new NotFoundException('Delegate with given id not found')
    }

    const dependant = await this.patientService.createDependant(delegateId, dependantBody)

    return ResponseWrapper.actionSucceed(dependant)
  }
}