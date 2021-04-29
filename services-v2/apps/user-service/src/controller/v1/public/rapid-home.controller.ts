import {Body, Controller, Post} from '@nestjs/common'
import {ApiBearerAuth, ApiTags} from '@nestjs/swagger'

import {ResponseWrapper} from '@opn-services/common/dto/response-wrapper'

import {PatientCreateDto} from '../../../dto/patient'
import {PatientService} from '../../../service/patient/patient.service'
import {HomeTestPatientDto} from '../../../dto/home-patient'
import {PublicDecorator} from '@opn-services/common/decorator/public.decorator'

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('/api/v1')
export class PatientController {
  constructor(private patientService: PatientService) {}

  @Post('/home-test-patients')
  async createHomeTestPatients(
    @Body() homeTestPatientBody: HomeTestPatientDto,
    @PublicDecorator() firebaseAuthUser,
  ): Promise<ResponseWrapper<string>> {
    const patient = await this.patientService.createProfile(<PatientCreateDto>{
      ...homeTestPatientBody,
      phoneNumber: firebaseAuthUser.phoneNumber,
    })

    return ResponseWrapper.actionSucceed(patient.idPatient)
  }
}
