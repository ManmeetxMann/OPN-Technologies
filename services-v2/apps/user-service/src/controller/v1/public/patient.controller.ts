import {Body, Controller, Get, NotFoundException, Post, Put, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiOperation, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {
  OpnCommonHeaders,
  OpnSources,
  RequiredUserPermission,
} from '@opn-services/common/types/authorization'
import {OpnSources as OpnPlatforms} from '@opn-common-v1/types/authorization'
import {
  AuthUserDecorator,
  Roles,
  OpnHeaders,
  PublicDecorator,
  ApiCommonHeaders,
} from '@opn-services/common/decorator'
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
  CreatePatientDTOResponse,
  PatientDTO,
  AuthenticateDto,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {LogInfo} from '@opn-services/common/utils/logging'
import {HomeTestPatientDto} from '@opn-services/user/dto/home-patient'
import {UserEvent, UserFunctions} from '@opn-services/common/types/activity-logs'

import {Platform} from '@opn-common-v1/types/platform'
import {MagicLinkService} from '@opn-common-v1/service/messaging/magiclink-service'
import {AuthShortCodeService} from '@opn-enterprise-v1/services/auth-short-code-service'
import {OpnConfigService} from '@opn-services/common/services'

@ApiTags('Patients')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1/patients')
export class PatientController {
  private magicLinkService: MagicLinkService
  constructor(
    private patientService: PatientService,
    private authShortCodeService: AuthShortCodeService,
    private configService: OpnConfigService,
  ) {
    this.magicLinkService = new MagicLinkService()
  }

  @Get()
  @UseGuards(AuthGuard)
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
  @ApiOperation({
    summary:
      'Notice: email is required for normal patient, postalCode is required for Home Test Patient',
  })
  async add(
    @PublicDecorator() firebaseAuthUser: AuthUser,
    @Body() patientDto: PatientCreateDto,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper<PatientUpdateDto>> {
    let patient: Patient

    patientDto.authUserId = firebaseAuthUser.authUserId

    const patientExists = await this.patientService.getAuthByAuthUserId(firebaseAuthUser.authUserId)
    if (patientExists) {
      throw new BadRequestException('User with given uid already exists')
    }

    if (opnHeaders.opnSourceHeader == OpnSources.FH_RapidHome_Web) {
      patientDto.phoneNumber = firebaseAuthUser.phoneNumber

      patient = await this.patientService.createHomePatientProfile(patientDto as HomeTestPatientDto)
    } else {
      const patientExists = await this.patientService.getAuthByEmail(patientDto.email)
      if (patientExists) {
        throw new BadRequestException('User with given email already exists')
      }
      const hasPublicOrg = [OpnSources.FH_Android, OpnSources.FH_IOS].includes(
        opnHeaders.opnSourceHeader,
      )
      patient = await this.patientService.createProfile(patientDto, hasPublicOrg)
    }

    const authShortCode = await this.authShortCodeService.generateAndSaveShortCode(
      patientDto.email,
      this.configService.get<string>('PUBLIC_ORG_ID'),
      firebaseAuthUser.id,
      OpnPlatforms.FHHealth,
    )

    await this.magicLinkService.send({
      email: patientDto.email,
      meta: {
        shortCode: authShortCode.shortCode,
        signInLink: authShortCode.magicLink,
      },
    })

    return ResponseWrapper.actionSucceed(CreatePatientDTOResponse(patient))
    const profile = await this.patientService.getProfilebyId(patient.idPatient)

    return ResponseWrapper.actionSucceed(patientProfileDto(profile))
  }

  @Put('/auth/confirmation')
  @Roles([RequiredUserPermission.RegUser])
  async authenticate(
    @AuthUserDecorator() authUser: AuthUser,
    @Body() authenticateDto: AuthenticateDto,
  ): Promise<ResponseWrapper> {
    const {patientId, organizationId} = authenticateDto
    const patientExists = await this.patientService.getbyId(authenticateDto.patientId)
    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    await this.patientService.connectOrganization(patientId, organizationId)
    await this.patientService.updateProfile(patientId, {isEmailVerified: true})
    return ResponseWrapper.actionSucceed()
  }

  @Get('/dependants')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  async getDependents(@AuthUserDecorator() authUser: AuthUser): Promise<ResponseWrapper> {
    const patientExists = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    const patient = await this.patientService.getDirectDependents(patientExists.idPatient)

    const dependantProfiles = await this.patientService.getProfilesByIds(
      patient.dependants.map(dependant => dependant.dependantId),
    )
    const dependantProfileDto = dependantProfiles.map(profile => patientProfileDto(profile))

    return ResponseWrapper.actionSucceed(dependantProfileDto)
  }

  @Put()
  @UseGuards(AuthGuard)
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

    const {registrationId, pushToken, osVersion, platform} = patientUpdateDto
    await this.patientService.upsertPushToken(registrationId, {
      osVersion,
      platform: platform as Platform,
      pushToken,
    })

    const updatedUser = await this.patientService.updateProfile(id, patientUpdateDto)
    LogInfo(UserFunctions.update, UserEvent.updateProfile, {
      oldUser: patientExists,
      updatedUser,
      updatedBy: id,
    })

    const profile = await this.patientService.getProfilebyId(updatedUser.idPatient)

    return ResponseWrapper.actionSucceed(patientProfileDto(profile))
  }

  @Post('/dependants')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  async addDependents(
    @Body() dependantBody: DependantCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper> {
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

    const profile = await this.patientService.getProfilebyId(dependant.idPatient)

    return ResponseWrapper.actionSucceed(patientProfileDto(profile))
  }
}
