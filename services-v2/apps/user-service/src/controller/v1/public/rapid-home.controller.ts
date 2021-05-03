import {Body, Controller, Post, UseGuards} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {LinkCodeToAccountDto, LinkToAccountDto} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {HomeTestPatientDto} from '../../../dto/home-patient'
import {PublicDecorator} from '@opn-services/common/decorator/public.decorator'
import {AuthGuard, AuthUserDecorator, Roles} from '@opn-services/common'
import {RequiredUserPermission} from '@opn-services/common/types/authorization'
import {User} from '@opn-common-v1/data/user'
import {EncryptionService} from '@opn-common-v1/service/encryption/encryption-service'
import {RapidHomeKitCodeService} from '../../../service/patient/rapid-home-kit-code.service'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1')
export class RapidHomeController {
  private encryptionService: EncryptionService = new EncryptionService()
  constructor(
    private patientService: PatientService,
    private homeKitCodeService: RapidHomeKitCodeService,
  ) {}

  @Post('/home-test-patients')
  async createHomeTestPatients(
    @Body() homeTestPatientBody: HomeTestPatientDto,
    @PublicDecorator() firebaseAuthUser,
  ): Promise<ResponseWrapper<string>> {
    const patient = await this.patientService.createHomePatientProfile({
      ...homeTestPatientBody,
      phoneNumber: firebaseAuthUser.phoneNumber,
      authUserId: firebaseAuthUser.uid,
    })

    return ResponseWrapper.actionSucceed(patient.idPatient)
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
