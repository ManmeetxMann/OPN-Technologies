import {Body, Controller, Post} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {PatientService} from '../../../service/patient/patient.service'
import {HomeTestPatientDto} from '../../../dto/home-patient'
import {PublicDecorator} from '@opn-services/common/decorator/public.decorator'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1')
export class RapidHomeController {
  constructor(private patientService: PatientService) {}

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
}
