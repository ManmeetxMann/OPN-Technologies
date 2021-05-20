import {Controller, Post, Body} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto'
import {LogInfo} from '@opn-services/common/utils/logging'
import {
  PatientUpdatePubSubProfile,
  PatientUpdatePubSubPayload,
} from '@opn-services/user/dto/patient'
import {PatientService} from '@opn-services/user/service/patient/patient.service'
import {PubSubEvents, PubSubFunctions} from '@opn-services/common/types/activity-logs'
import {OPNPubSub} from '@opn-common-v1/service/google/pub_sub'

@ApiTags('Patient PubSub')
@Controller('/api/v1/internal/patients/pubsub')
export class PatientPubSubController {
  constructor(private patientService: PatientService) {}

  @Post('/update')
  async updateProfile(@Body() payload: PatientUpdatePubSubPayload): Promise<ResponseWrapper> {
    const {data, attributes} = payload.message
    const publishedData = await OPNPubSub.getPublishedData(data)
    const updatePayload = publishedData['appointment'] as Partial<PatientUpdatePubSubProfile>

    LogInfo(PubSubFunctions.updateProfile, PubSubEvents.profileUpdateStarted, {
      attributes,
      publishedData, //TODO: remove: for now debugging purpose
    })

    await this.patientService.updateProfileWithPubSub(attributes.userId, updatePayload)

    return ResponseWrapper.actionSucceed()
  }
}
