import {Body, Controller, Get, NotFoundException, Post, Put, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiBody, ApiExtraModels, ApiResponse, ApiTags, refs} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthGuard} from '@opn-services/common/guard'
import {
  AuthTypes,
  OpnCommonHeaders,
  OpnSources,
  RequiredUserPermission,
} from '@opn-services/common/types/authorization'
import {
  AuthUserDecorator,
  Roles,
  OpnHeaders,
  PublicDecorator,
  ApiCommonHeaders,
  ApiAuthType,
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
  MigrateDto,
  AuthenticateDto,
  NormalPatientCreateDto,
  PatientProfile,
  DependantProfile,
  unconfirmedPatientDto,
  UnconfirmedPatient,
  AttachOrganization,
  PatientOrganizationsDto,
  AttachOrganizationResponse,
} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {LogInfo} from '@opn-services/common/utils/logging'
import {HomeTestPatientDto} from '@opn-services/user/dto/home-patient'
import {UserEvent, UserFunctions} from '@opn-services/common/types/activity-logs'

import {Platform} from '@opn-common-v1/types/platform'
import {MagicLinkService} from '@opn-common-v1/service/messaging/magiclink-service'
import {AuthShortCodeService} from '@opn-enterprise-v1/services/auth-short-code-service'
import {OpnConfigService} from '@opn-services/common/services'
import * as _ from 'lodash'
import {ActionStatus} from '@opn-services/common/model'
import {PatientToOrganization} from '@opn-services/user/model/patient/patient-relations.entity'

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
  @ApiResponse({type: PatientProfile})
  async getById(@AuthUserDecorator() authUser: AuthUser): Promise<ResponseWrapper<PatientProfile>> {
    const patient = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    const users = await this.patientService.findNewUsersByEmail(patient?.auth?.email)
    const resultExitsForProvidedEmail = !!users.length

    return ResponseWrapper.actionSucceed(patientProfileDto(patient, {resultExitsForProvidedEmail}))
  }

  @Get('/organizations')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  @ApiResponse({type: PatientOrganizationsDto, isArray: true})
  async getUserOrganizations(@AuthUserDecorator() authUser: AuthUser): Promise<ResponseWrapper> {
    const patient = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patient) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    // It's casts as unknown because we've relation changed to firestore organizations temporary
    const userOrganizations = await this.patientService.getUserOrganizations(
      (patient.organizations as unknown) as PatientToOrganization[],
    )

    return ResponseWrapper.actionSucceed(userOrganizations)
  }

  @Post()
  @ApiBody({
    schema: {
      oneOf: refs(NormalPatientCreateDto, HomeTestPatientDto),
    },
  })
  @ApiExtraModels(NormalPatientCreateDto, HomeTestPatientDto)
  @ApiAuthType(AuthTypes.Firebase)
  @ApiResponse({type: PatientProfile})
  async add(
    @PublicDecorator() firebaseAuthUser: AuthUser,
    @Body() patientDto: PatientCreateDto,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper<PatientProfile>> {
    let patient: Patient

    patientDto.authUserId = firebaseAuthUser.authUserId

    const patientExists = await this.patientService.getAuthByAuthUserId(firebaseAuthUser.authUserId)
    if (patientExists) {
      throw new BadRequestException('User with given uid already exists')
    }

    if (opnHeaders.opnSourceHeader == OpnSources.FH_RapidHome_Web) {
      patientDto.phoneNumber = firebaseAuthUser.phoneNumber

      patient = await this.patientService.createHomePatientProfile(
        patientDto as HomeTestPatientDto,
        opnHeaders.opnSourceHeader,
      )
    } else {
      const patientExists = await this.patientService.getAuthByEmail(patientDto.email)
      if (patientExists) {
        throw new BadRequestException('User with given email already exists')
      }
      const hasPublicOrg = [OpnSources.FH_Android, OpnSources.FH_IOS].includes(
        opnHeaders.opnSourceHeader,
      )
      if (!patientDto.phoneNumber) {
        patientDto.phoneNumber = firebaseAuthUser.phoneNumber
      }
      patient = await this.patientService.createProfile(
        patientDto,
        hasPublicOrg,
        opnHeaders.opnSourceHeader,
      )
    }

    let resultExitsForProvidedEmail = false
    if (patientExists) {
      const users = await this.patientService.findNewUsersByEmail(patientExists.email)
      resultExitsForProvidedEmail = !!users.length
    }

    const patientProfile = await this.patientService.getProfilebyId(patient.idPatient)

    return ResponseWrapper.actionSucceed(
      patientProfileDto(patientProfile, {resultExitsForProvidedEmail}),
    )
  }

  @Put('/email/verify')
  @Roles([RequiredUserPermission.RegUser])
  async triggerEmail(@AuthUserDecorator() authUser: AuthUser): Promise<void> {
    const patientExists = await this.patientService.getAuthByAuthUserId(authUser.authUserId)
    if (!patientExists) {
      throw new ResourceNotFoundException('User with given uid not found')
    }

    await this.patientService.findAndRemoveShortCodes(patientExists.email)
    const authShortCode = await this.authShortCodeService.generateAndSaveShortCode(
      patientExists.email,
      this.configService.get<string>('PUBLIC_ORG_ID'),
      authUser.id,
      false,
    )

    await this.magicLinkService.send({
      email: patientExists.email,
      meta: {
        shortCode: authShortCode.shortCode,
      },
    })
  }

  @Put('/email/verified')
  @Roles([RequiredUserPermission.RegUser])
  async authenticate(
    @AuthUserDecorator() authUser: AuthUser,
    @Body() authenticateDto: AuthenticateDto,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper> {
    const {organizationId, code} = authenticateDto
    const patientExists = await this.patientService.getAuthByAuthUserId(authUser.authUserId)
    if (!patientExists) {
      throw new NotFoundException('User with given id not found')
    }

    const shortCode = await this.patientService.findShortCodeByPatientEmail(patientExists.email)
    await this.patientService.verifyCodeOrThrowError(shortCode.shortCode, code)
    await this.patientService.connectOrganization(Number(patientExists.patientId), organizationId)
    await this.patientService.updateProfile(
      Number(patientExists.patientId),
      {isEmailVerified: true},
      opnHeaders.opnSourceHeader,
    )
    return ResponseWrapper.actionSucceed()
  }

  @Get('/dependants')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  @ApiResponse({type: DependantProfile, isArray: true})
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
  @ApiResponse({type: PatientProfile})
  async update(
    @Body() patientUpdateDto: PatientUpdateDto,
    @AuthUserDecorator() authUser: AuthUser,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
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

    if (patientUpdateDto?.registration) {
      const {pushToken, osVersion, platform} = patientUpdateDto.registration
      await this.patientService.upsertPushToken(id, {
        osVersion,
        platform: platform as Platform,
        pushToken,
        tokenSource: opnHeaders.opnSourceHeader,
      })
    }

    const updatedUser = await this.patientService.updateProfile(
      id,
      patientUpdateDto,
      opnHeaders.opnSourceHeader,
    )
    LogInfo(UserFunctions.update, UserEvent.updateProfile, {
      userId: patientExists.idPatient,
      updatedBy: id,
    })

    const profile = await this.patientService.getProfilebyId(updatedUser.idPatient)

    return ResponseWrapper.actionSucceed(patientProfileDto(profile))
  }

  @Post('/dependants')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  @ApiResponse({type: DependantProfile})
  async addDependents(
    @Body() dependantBody: DependantCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
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

    const dependant = await this.patientService.createDependant(
      delegateId,
      dependantBody,
      opnHeaders.opnSourceHeader,
    )
    LogInfo(UserFunctions.addDependents, UserEvent.createPatient, {
      newUserId: dependant.idPatient,
      createdBy: authUser.id,
    })

    const profile = await this.patientService.getProfilebyId(dependant.idPatient)

    return ResponseWrapper.actionSucceed(patientProfileDto(profile))
  }

  @Post('/migrate')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  async migrate(
    @Body() {migrations}: MigrateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<Record<string, ActionStatus>>> {
    const patientResponse = await Promise.all(
      migrations.map(async migration => [
        migration.notConfirmedPatientId,
        await this.patientService.migratePatient(authUser.id, migration),
      ]),
    )
    return ResponseWrapper.actionSucceed(_.fromPairs(patientResponse))
  }

  @Get('/unconfirmed')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  @ApiResponse({type: UnconfirmedPatient})
  async getUnconfirmedPatients(
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<UnconfirmedPatient[]>> {
    const patients = await this.patientService.getUnconfirmedPatients(
      authUser.phoneNumber,
      authUser.email,
      authUser.id,
    )

    return ResponseWrapper.actionSucceed(patients.map(unconfirmedPatientDto))
  }

  @Put('/patient/organization')
  @UseGuards(AuthGuard)
  @Roles([RequiredUserPermission.RegUser])
  @ApiResponse({type: AttachOrganizationResponse, status: 200})
  async attachOrganization(
    @AuthUserDecorator() authUser: AuthUser,
    @Body() {organizationCode}: AttachOrganization,
  ): Promise<ResponseWrapper<AttachOrganizationResponse>> {
    const name = await this.patientService.attachOrganization(organizationCode, authUser.id)

    return ResponseWrapper.actionSucceed({name})
  }
}
