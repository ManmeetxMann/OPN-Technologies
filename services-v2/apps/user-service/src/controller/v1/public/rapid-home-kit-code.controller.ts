import {Controller, Get, Param, UseGuards} from '@nestjs/common'
import {ApiHeader, ApiTags} from '@nestjs/swagger'

import {AuthGuard, CaptchaGuard} from '@opn-services/common/guard'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {ResourceNotFoundException} from '@opn-services/common/exception/resource-not-found-exception'

import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'

import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'

@ApiTags('Rapid Home Kit Codes')
@Controller('/api/v1')
@UseGuards(AuthGuard)
export class RapidHomeKitCodeController {
  private encryptionService: EncryptionService = new EncryptionService()

  constructor(private homeKitCodeService: RapidHomeKitCodeService) {}

  @Get('rapid-home-kit-codes/:code')
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
