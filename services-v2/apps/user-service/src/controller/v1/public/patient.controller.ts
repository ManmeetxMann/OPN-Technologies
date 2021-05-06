import {Body, Controller, Get, NotFoundException, Post, Put, UseGuards} from '@nestjs/common'
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
import {AuthUser} from '@opn-services/common/model'

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

import {MessagingFactory} from '@opn-common-v1/service/messaging/messaging-service'
import {FirebaseMessagingService} from '@opn-common-v1/service/messaging/firebase-messaging-service'
import {RegistrationService} from '@opn-common-v1/service/registry/registration-service'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1/patients')
@UseGuards(AuthGuard)
export class PatientController {
  private messaging: FirebaseMessagingService
  private registrationService: RegistrationService

  constructor(private patientService: PatientService) {
    this.messaging = MessagingFactory.getPushableMessagingService()
    this.registrationService = new RegistrationService()
  }

  @Get()
  @Roles([RequiredUserPermission.RegUser])
  async getById(
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<PatientUpdateDto>> {
    const patient = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    return ResponseWrapper.actionSucceed(patientProfileDto(patient))
  }

  @Post()
  @Roles([RequiredUserPermission.RegUser])
  async add(
    @AuthUserDecorator() authUser: AuthUser,
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

  @Get('/dependants')
  @Roles([RequiredUserPermission.RegUser])
  async getDependents(@AuthUserDecorator() authUser: AuthUser): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    const patient = await this.patientService.getDirectDependents(patientExists.idPatient)
    return ResponseWrapper.actionSucceed(patient.dependants)
  }

  @Put()
  @Roles([RequiredUserPermission.RegUser])
  async update(
    @Body() patientUpdateDto: PatientUpdateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patientExists) {
      throw new ResourceNotFoundException('User with given id not found')
    }
    const id = patientExists.idPatient
    const isResourceOwner = await this.patientService.isResourceOwner(id, authUser.authUserId)
    if (!isResourceOwner) {
      throw new ForbiddenException('Permission not found for this resource')
    }

    const {registrationId, pushToken} = patientUpdateDto

    if (registrationId && pushToken) {
      await this.messaging.validatePushToken(pushToken)
      await this.registrationService.updateProperty(registrationId, 'pushToken', pushToken)
    }

    const updatedUser = await this.patientService.updateProfile(id, patientUpdateDto)
    LogInfo(UserFunctions.update, UserEvent.updateProfile, {
      oldUser: patientExists,
      updatedUser,
      updatedBy: id,
    })

    return ResponseWrapper.actionSucceed()
  }

  @Post('/dependant')
  @Roles([RequiredUserPermission.RegUser])
  async addDependents(
    @Body() dependantBody: DependantCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<Patient>> {
    const delegateExists = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!delegateExists) {
      throw new ResourceNotFoundException('Delegate with given id not found')
    }
    const delegateId = delegateExists.idPatient
    const isResourceOwner = await this.patientService.isResourceOwner(
      delegateId,
      authUser.authUserId,
    )

    if (!isResourceOwner) {
      throw new ForbiddenException('Permission not found for this resource')
    }

    const dependant = await this.patientService.createDependant(delegateId, dependantBody)
    LogInfo(UserFunctions.addDependents, UserEvent.createPatient, {
      newUser: dependant,
      createdBy: authUser.id,
    })

    return ResponseWrapper.actionSucceed(dependant)
  }
}
