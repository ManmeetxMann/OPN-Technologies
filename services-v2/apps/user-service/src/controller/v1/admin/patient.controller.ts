import {Body, Controller, Get, Headers, Param, Post, Put, Query, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiResponse, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {OpnCommonHeaders, OpnSources, RequiredUserPermission} from '@opn-services/common/types/authorization'
import {UserFunctions, UserEvent} from '@opn-services/common/types/activity-logs'
import {ApiCommonHeaders, OpnHeaders, Roles} from '@opn-services/common/decorator'
import {AuthUser} from '@opn-services/common/model'

import {assignWithoutUndefined, ResponseStatusCodes} from '@opn-services/common/dto'
import {AuthUserDecorator} from '@opn-services/common/decorator'
import {Patient} from '../../../model/patient/patient.entity'
import {
  PatientCreateAdminDto,
  PatientFilter,
  patientProfileDto,
  DependantCreateAdminDto,
  PatientUpdateAdminDto,
  PatientProfile,
  DependantProfile,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {LogInfo} from '@opn-services/common/utils/logging'
import {BadRequestException, ResourceNotFoundException} from '@opn-services/common/exception'
import { mapOpnSourceHeader } from '@opn-services/common/utils/registration'

@ApiTags('Patients - Admin')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/admin/api/v1/patients')
@UseGuards(AuthGuard)
export class AdminPatientController {
  constructor(private patientService: PatientService) {}

  @Get()
  @Roles([RequiredUserPermission.PatientsAdmin])
  @ApiResponse({type: PatientProfile, isArray: true})
  async getAll(@Query() filter: PatientFilter): Promise<ResponseWrapper<PatientProfile[]>> {
    const {data, page, totalItems, totalPages} = await this.patientService.getAll(
      assignWithoutUndefined(filter, new PatientFilter()),
    )

    return ResponseWrapper.of(
      data.map(patient => patientProfileDto(patient)),
      ResponseStatusCodes.Succeed,
      null,
      page,
      totalPages,
      totalItems,
    )
  }

  @Get('/:patientId')
  @Roles([RequiredUserPermission.PatientsAdmin])
  @ApiResponse({type: PatientProfile})
  async getById(@Param('patientId') id: string): Promise<ResponseWrapper<PatientProfile>> {
    const patient = await this.patientService.getProfilebyId(Number(id))

    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Get('/:patientId/dependants')
  @Roles([RequiredUserPermission.PatientsAdmin])
  @ApiResponse({type: DependantProfile, isArray: true})
  async getDependents(
    @Param('patientId') id: string,
  ): Promise<ResponseWrapper<DependantProfile[]>> {
    const patientExists = await this.patientService.getProfilebyId(Number(id))
    if (!patientExists) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    const patient = await this.patientService.getDirectDependents(Number(id))

    const dependantProfiles = await this.patientService.getProfilesByIds(
      patient.dependants.map(dependant => dependant.dependantId),
    )
    const dependantProfileDto = dependantProfiles.map(profile => patientProfileDto(profile))

    return ResponseWrapper.actionSucceed(dependantProfileDto)
  }

  @Post()
  @Roles([RequiredUserPermission.PatientsAdmin])
  @ApiResponse({type: Patient})
  async add(
    @Body() patientDto: PatientCreateAdminDto,
    @AuthUserDecorator() authUser: AuthUser,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper<Patient>> {
    const patientExists = await this.patientService.getAuthByEmail(patientDto.email)

    if (patientExists) {
      throw new BadRequestException('User with given email already exists')
    }

    const patient = await this.patientService.createProfile(patientDto, false, mapOpnSourceHeader(opnHeaders.opnSourceHeader))

    LogInfo(UserFunctions.add, UserEvent.createPatient, {
      newUser: patient,
      createdBy: authUser.id,
    })

    return ResponseWrapper.actionSuccess(patient, 'Patient created successfully')
  }

  @Put('/:patientId')
  @Roles([RequiredUserPermission.PatientsAdmin])
  async update(
    @AuthUserDecorator() authUser: AuthUser,
    @Param('patientId') id: string,
    @Body() patientUpdateDto: PatientUpdateAdminDto,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getbyId(Number(id))

    if (!patientExists) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    const updatedUser = await this.patientService.updateProfile(Number(id), patientUpdateDto, mapOpnSourceHeader(opnHeaders.opnSourceHeader))

    LogInfo(UserFunctions.update, UserEvent.updateProfile, {
      oldUser: patientExists,
      updatedUser,
      updatedBy: authUser.id,
    })

    return ResponseWrapper.actionSucceed()
  }

  @Post('/:patientId/dependants')
  @Roles([RequiredUserPermission.PatientsAdmin])
  async addDependents(
    @Param('patientId') delegateId: string,
    @Body() dependantBody: DependantCreateAdminDto,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper<Patient>> {
    const delegateExists = await this.patientService.getbyId(Number(delegateId))

    if (!delegateExists) {
      throw new ResourceNotFoundException('Delegate with given id not found')
    }

    const dependant = await this.patientService.createDependant(Number(delegateId), dependantBody, mapOpnSourceHeader(opnHeaders.opnSourceHeader))

    return ResponseWrapper.actionSucceed(dependant)
  }
}
