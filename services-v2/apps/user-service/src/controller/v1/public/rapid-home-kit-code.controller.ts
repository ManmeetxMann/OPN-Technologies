import {Controller, Get, Param, UseGuards} from '@nestjs/common'
import {ApiHeader, ApiTags} from '@nestjs/swagger'
import {ConfigService} from '@nestjs/config'

import {CaptchaGuard} from '@opn-services/common/guard'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {ResourceNotFoundException} from '@opn-services/common/exception/resource-not-found-exception'

import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'

import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'

@ApiTags('Rapid Home Kit Codes')
@Controller('/api/v1/rapid-home-kit-codes')
export class RapidHomeKitCodeController {
  private encryptionService: EncryptionService

  constructor(
    private homeKitCodeService: RapidHomeKitCodeService,
    private configService: ConfigService,
  ) {
    this.encryptionService = new EncryptionService(
      this.configService.get('RAPID_HOME_KIT_CODE_ENCRYPTION_KEY'),
    )
  }

  @Get('/:code')
  @ApiHeader({name: 'captcha-token', required: true})
  @UseGuards(CaptchaGuard)
  async checkCode(@Param('code') code: string): Promise<ResponseWrapper> {
    const [homeKitCode] = await this.homeKitCodeService.get(code)
    if (!homeKitCode) {
      throw new ResourceNotFoundException(`Requested code: ${code} not found`)
    }

    const encryptedToken = this.encryptionService.encrypt(homeKitCode.code)

    return ResponseWrapper.actionSucceed({encryptedToken})
  }
}
