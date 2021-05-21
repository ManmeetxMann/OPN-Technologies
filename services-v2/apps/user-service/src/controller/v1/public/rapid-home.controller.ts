import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {LinkCodeToAccountDto, LinkToAccountDto} from '../../../dto/patient'
import {ApiCommonHeaders, AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'
import {OpnConfigService} from '@opn-services/common/services'
import {CouponService} from '@opn-reservation-v1/services/coupon.service'
import {CouponEnum} from '@opn-reservation-v1/models/coupons'

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
    const couponCode = await this.couponService.createCoupon(
      authUser.email,
      CouponEnum.forRapidHome,
    )
    await this.couponService.saveCoupon(couponCode)
    return ResponseWrapper.actionSucceed({couponCode: couponCode})
  }
}
