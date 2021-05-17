import {Controller, Post, Body} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto'
import {LogInfo} from '@opn-services/common/utils/logging'
import {
  PatientUpdatePubSubPayload,
  PatientUpdatePubSubMessage,
} from '@opn-services/user/dto/patient'
import {PatientService} from '@opn-services/user/service/patient/patient.service'
import {OPNPubSub} from '@opn-common-v1/service/google/pub_sub'

@ApiTags('Patient PubSub')
@Controller('/api/v1/internal/patients/pubsub')
export class PatientPubSubController {
  constructor(private patientService: PatientService) {}

  @Post('/update')
  async updatePatient(@Body() message: PatientUpdatePubSubMessage): Promise<ResponseWrapper> {
    const {data, attributes} = message
    const payload = await OPNPubSub.getPublishedData(data)

    const updatePayload = payload as Partial<PatientUpdatePubSubPayload>

    LogInfo('updatePatient', 'UpdatePatientFromPubSub', {
      attributes,
      data, //TODO: remove: for now debugging purpose
    })

    await this.patientService.updateProfileWithPubSub(attributes.userId, updatePayload)

    return ResponseWrapper.actionSucceed()
  }
}
