import {Controller, Get, Param} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'
import {ResourceNotFoundException} from '@opn-services/common/exception/resource-not-found-exception'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'

//TODO: captcha token check
@ApiTags('Rapid Home Kit Codes')
@Controller('/api/v1/rapid-home-kit-codes')
export class RapidHomeKitCodeController {
  private encryptionService: EncryptionService = new EncryptionService()

  constructor(private homeKitCodeService: RapidHomeKitCodeService) {}

  @Get('/:code')
  async checkCode(@Param('code') code: string): Promise<ResponseWrapper> {
    const [homeKitCode] = await this.homeKitCodeService.get(code)
    if (!homeKitCode) {
      throw new ResourceNotFoundException(`Requested code: ${code} not found`)
    }

    const encryptedToken = this.encryptionService.encrypt(homeKitCode.code)

    return ResponseWrapper.actionSucceed({encryptedToken})
  }
}
