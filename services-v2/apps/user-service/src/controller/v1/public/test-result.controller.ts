import {Body, Controller, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'
import {ApiCommonHeaders, AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthUser} from '@opn-services/common/model'
import {ResponseWrapper} from '@opn-services/common/dto'
import {TestResultCreateDto} from '@opn-services/user/dto/test-result'
import {TestResultService} from '@opn-services/user/service/patient/test-result.service'
import {RapidHomeKitCodeService} from '@opn-services/user/service/patient/rapid-home-kit-code.service'
import {ResourceNotFoundException} from '@opn-services/common/exception'

@ApiTags('PCR Test Results')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1/pcr-test-results')
@UseGuards(AuthGuard)
export class TestResultController {
  constructor(
    private testResultService: TestResultService,
    private homeKitCodeService: RapidHomeKitCodeService,
  ) {}

  @Post('')
  @Roles([RequiredUserPermission.RegUser])
  async createPCRResults(
    @Body() {homeKitCode, ...testResult}: TestResultCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<TestResultCreateDto>> {
    const [homeKit] = await this.homeKitCodeService.get(homeKitCode)
    if (!homeKit) {
      throw new ResourceNotFoundException('Home kit not found')
    }
    const result = await this.testResultService.createPCRResults(
      {
        ...testResult,
        homeKitId: homeKit.id,
      },
      authUser.id,
    )
    const validatedUserData = this.testResultService.validateUserData(testResult)
    await this.testResultService.syncUser(validatedUserData, authUser.id)
    await this.homeKitCodeService.markAsUsedHomeKitCode(homeKit.id, homeKit.code, authUser.id)

    return ResponseWrapper.actionSucceed(result)
  }
}
