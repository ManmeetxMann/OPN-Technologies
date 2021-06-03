import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {CouponDto, LinkCodeToAccountDto, LinkToAccountDto} from '../../../dto/patient'
import {ApiCommonHeaders, AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'
import {OpnConfigService} from '@opn-services/common/services'
import {CouponService} from '@opn-reservation-v1/services/coupon.service'
import {CouponEnum} from '@opn-reservation-v1/models/coupons'
import {ResourceNotFoundException} from '@opn-services/common/exception'
import {timestampToFormattedIso} from '@opn-services/checkout/utils/times'
import {PatientService} from '@opn-services/user/service/patient/patient.service'

@ApiTags('Patients')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1')
export class RapidHomeController {
  private encryptionService: EncryptionService
  private couponService: CouponService

  constructor(
    private homeKitCodeService: RapidHomeKitCodeService,
    private configService: OpnConfigService,
    private patientService: PatientService,
  ) {
    this.encryptionService = new EncryptionService(
      this.configService.get('RAPID_HOME_KIT_CODE_ENCRYPTION_KEY'),
    )
    this.couponService = new CouponService()
  }

  @Get('rapid-home-kit-user-codes')
  @Roles([RequiredUserPermission.RegUser])
  @UseGuards(AuthGuard)
  async getLinkedCodes(@AuthUserDecorator() authUser: User): Promise<ResponseWrapper> {
    const codes = await this.homeKitCodeService.getCodesByUserId(authUser.id)
    return ResponseWrapper.actionSucceed({
      codes: codes.map(code => ({
        rapidHomeKitId: code.rapidHomeKitId,
        addedDate: timestampToFormattedIso(code.timestamps.createdAt),
      })),
    })
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
  async createCoupon(
    @Body() couponBody: CouponDto,
    @AuthUserDecorator() authUser: User,
  ): Promise<ResponseWrapper> {
    const {email} = couponBody

    if (authUser.email && authUser.email !== email) {
      throw new ResourceNotFoundException('email does not belong to user')
    }

    const patientExists = await this.patientService.getProfileByFirebaseKey(authUser.id)
    if (!patientExists) {
      throw new ResourceNotFoundException('User with given id not found')
    }

    const couponCode = await this.couponService.createCoupon(
      authUser.email,
      CouponEnum.forRapidHome,
    )
    await this.couponService.saveCoupon(couponCode)
    await this.patientService.updateProfile(patientExists.idPatient, {email})

    return ResponseWrapper.actionSucceed({couponCode: 'couponCode'})
  }
}
