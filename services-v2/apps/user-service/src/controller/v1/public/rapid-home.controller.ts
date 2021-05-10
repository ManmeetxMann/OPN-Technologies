import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {AuthUser} from '@opn-services/common/model'

import {LinkCodeToAccountDto, LinkToAccountDto} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {HomeTestPatientDto} from '../../../dto/home-patient'
import {PublicDecorator} from '@opn-services/common/decorator/public.decorator'
import {AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'
import {ConfigService} from '@nestjs/config'
import {CouponService} from '@opn-reservation-v1/services/coupon.service'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1')
export class RapidHomeController {
  private encryptionService: EncryptionService
  private couponService: CouponService

  constructor(
    private patientService: PatientService,
    private homeKitCodeService: RapidHomeKitCodeService,
    private configService: ConfigService,
  ) {
    this.encryptionService = new EncryptionService(
      this.configService.get('RAPID_HOME_KIT_CODE_ENCRYPTION_KEY'),
    )
    this.couponService = new CouponService()
  }

  @Post('/home-test-patients')
  async createHomeTestPatients(
    @Body() homeTestPatientBody: HomeTestPatientDto,
    @PublicDecorator() firebaseAuthUser: AuthUser,
  ): Promise<ResponseWrapper<string>> {
    const patient = await this.patientService.createHomePatientProfile({
      ...homeTestPatientBody,
      phoneNumber: firebaseAuthUser.phoneNumber,
      authUserId: firebaseAuthUser.authUserId,
    })

    return ResponseWrapper.actionSucceed(patient.idPatient)
  }

  @Get('rapid-home-kit-user-codes')
  @Roles([RequiredUserPermission.RegUser])
  @UseGuards(AuthGuard)
  async getLinkedCodes(@AuthUserDecorator() authUser: User): Promise<ResponseWrapper> {
    const codes = await this.homeKitCodeService.getCodesByUserId(authUser.id)
    return ResponseWrapper.actionSucceed({codes: codes.map(({rapidHomeKitId}) => rapidHomeKitId)})
  }

  @Post('rapid-home-kit-codes')
  @Roles([RequiredUserPermission.RegUser])
  @UseGuards(AuthGuard)
  async linkCodeToAccount(
    @Body() linkToAccountBody: LinkCodeToAccountDto,
    @AuthUserDecorator() authUser: User,
  ): Promise<ResponseWrapper> {
    const {code} = linkToAccountBody

    await this.homeKitCodeService.assocHomeKitToUser(code, authUser.id)
    return ResponseWrapper.actionSucceed({})
  }

  @Post('rapid-home-kit-user-codes/link-to-account')
  @Roles([RequiredUserPermission.RegUser])
  @UseGuards(AuthGuard)
  async linkToAccount(
    @Body() linkToAccountBody: LinkToAccountDto,
    @AuthUserDecorator() authUser: User,
  ): Promise<ResponseWrapper> {
    const {encryptedToken} = linkToAccountBody

    const decryptedCode = this.encryptionService.decrypt(encryptedToken)
    await this.homeKitCodeService.assocHomeKitToUser(decryptedCode, authUser.id)
    return ResponseWrapper.actionSucceed({})
  }

  @Post('home-test-patients/coupon')
  @Roles([RequiredUserPermission.RegUser])
  @UseGuards(AuthGuard)
  async createCoupon(@AuthUserDecorator() authUser: User): Promise<ResponseWrapper> {
    const couponCode = await this.couponService.createCoupon(authUser.email)
    return ResponseWrapper.actionSucceed({couponCode: couponCode})
  }
}
