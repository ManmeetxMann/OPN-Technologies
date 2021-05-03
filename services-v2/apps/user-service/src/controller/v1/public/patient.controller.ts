import {Body, Controller, Get, Param, Post, Put, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthUserDecorator, Roles} from '@opn-services/common/decorator'
import {
  BadRequestException,
  ForbiddenException,
  ResourceNotFoundException,
} from '@opn-services/common/exception'

import {Patient} from '../../../model/patient/patient.entity'
import {
  DependantCreateDto,
  PatientUpdateDto,
  patientProfileDto,
  PatientCreateDto,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {LogInfo} from '@opn-services/common/utils/logging'
import {UserEvent, UserFunctions} from '@opn-services/common/types/activity-logs'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1/patients')
@UseGuards(AuthGuard)
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Get('/:patientId')
  @Roles([RequiredUserPermission.RegUser], true)
  async getById(@Param('patientId') id: string): Promise<ResponseWrapper<PatientUpdateDto>> {
    const patient = await this.patientService.getProfilebyId(id)

    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Post()
  @Roles([RequiredUserPermission.RegUser], true)
  async add(
    @AuthUserDecorator() authUser,
    @Body() patientDto: PatientCreateDto,
  ): Promise<ResponseWrapper<Patient>> {
    const patientExists = await this.patientService.getAuthByEmail(patientDto.email)

    if (patientExists) {
      throw new BadRequestException('User with given email already exists')
    }

    patientDto.email = authUser.email

    const patient = await this.patientService.createProfile(patientDto)

    return ResponseWrapper.actionSucceed(patient)
  }

  @Put('/:patientId')
  @Roles([RequiredUserPermission.RegUser], true)
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
      throw new ResourceNotFoundException('User with given id not found')
    }

    const updatedUser = await this.patientService.updateProfile(id, patientUpdateDto)
    LogInfo(UserFunctions.update, UserEvent.updateProfile, {
      oldUser: patientExists,
      updatedUser,
      updatedBy: id,
    })

    return ResponseWrapper.actionSucceed()
  }

  @Post('/:patientId/dependant')
  @Roles([RequiredUserPermission.RegUser], true)
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
      throw new ResourceNotFoundException('Delegate with given id not found')
    }

    const dependant = await this.patientService.createDependant(delegateId, dependantBody)
    LogInfo(UserFunctions.addDependents, UserEvent.createPatient, {
      newUser: dependant,
      createdBy: authUser.id,
    })

    return ResponseWrapper.actionSucceed(dependant)
  }
}
