import {Body, Controller, Get, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {LinkCodeToAccountDto, LinkToAccountDto} from '../../../dto/patient'
import {ApiCommonHeaders, AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'
import {ConfigService} from '@nestjs/config'

@ApiTags('Patients')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1')
export class RapidHomeController {
  private encryptionService: EncryptionService

  constructor(
    private homeKitCodeService: RapidHomeKitCodeService,
    private configService: ConfigService,
  ) {
    this.encryptionService = new EncryptionService(
      this.configService.get('RAPID_HOME_KIT_CODE_ENCRYPTION_KEY'),
    )
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
}
