import {Body, Controller, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'
import {AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthUser} from '@opn-services/common/model'
import {ResponseWrapper} from '@opn-services/common/dto'
import {TestResultCreateDto} from '../../../dto/test-result'
import {TestResultService} from '../../../service/patient/test-result.service'

@ApiTags('PCR Test Results')
@ApiBearerAuth()
@Controller('/api/v1/pcr-test-results')
@UseGuards(AuthGuard)
export class TestResultController {
  constructor(private testResultService: TestResultService) {}

  @Post('')
  @Roles([RequiredUserPermission.RegUser])
  async createPCRResults(
    @Body() testResult: TestResultCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<TestResultCreateDto>> {
    const result = await this.testResultService.createPCRResults(testResult)
    const validatedUserData = this.testResultService.validateUserData(testResult)
    await this.testResultService.syncUser(validatedUserData, authUser.id)

    return ResponseWrapper.actionSucceed(result)
  }
}
