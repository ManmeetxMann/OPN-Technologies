import {Body, Controller, NotFoundException, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'
import {ApiCommonHeaders, AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {AuthUser} from '@opn-services/common/model'
import {ResponseWrapper} from '@opn-services/common/dto'
import {TestResultCreateDto} from '@opn-services/user/dto/test-result'
import {TestResultService} from '@opn-services/user/service/patient/test-result.service'
import {RapidHomeKitCodeService} from '@opn-services/user/service/patient/rapid-home-kit-code.service'
import {ResourceNotFoundException} from '@opn-services/common/exception'
import {PatientService} from '@opn-services/user/service/patient/patient.service'

@ApiTags('PCR Test Results')
@ApiBearerAuth()
@ApiCommonHeaders()
@Controller('/api/v1/pcr-test-results')
@UseGuards(AuthGuard)
export class TestResultController {
  constructor(
    private testResultService: TestResultService,
    private homeKitCodeService: RapidHomeKitCodeService,
    private patientService: PatientService,
  ) {}

  @Post('')
  @Roles([RequiredUserPermission.RegUser])
  async createPCRResults(
    @Body() {homeKitCode, dependantId, organizationId, ...testResult}: TestResultCreateDto,
    @AuthUserDecorator() authUser: AuthUser,
  ): Promise<ResponseWrapper<TestResultCreateDto>> {
    const patientExists = dependantId
      ? await this.patientService.getPatientByDependantId(dependantId)
      : null

    if (dependantId && !patientExists) {
      throw new NotFoundException('patient with given dependantId not found')
    }

    const userId = dependantId ? patientExists.firebaseKey : authUser.id
    const [homeKit] = await this.homeKitCodeService.get(homeKitCode)
    if (!homeKit) {
      throw new ResourceNotFoundException('Home kit not found')
    }

    // TODO userId te authUser.id
    const isOrgIdValid = organizationId
      ? await this.testResultService.validateOrganization(organizationId, userId)
      : null

    const props = isOrgIdValid
      ? {...testResult, homeKitId: homeKit.id, organizationId}
      : {...testResult, homeKitId: homeKit.id}

    const result = await this.testResultService.createPCRResults({...props}, userId)
    const validatedUserData = this.testResultService.validateUserData(testResult)
    await this.testResultService.syncUser(validatedUserData, userId)
    await this.homeKitCodeService.markAsUsedHomeKitCode(homeKit.id, homeKit.code, authUser.id)

    return ResponseWrapper.actionSucceed(result)
  }
}
