import {Controller, Post, Body} from '@nestjs/common'
import {ApiTags} from '@nestjs/swagger'
import {ResponseWrapper} from '@opn-services/common/dto'
import {ApiAuthType, OpnHeaders} from '@opn-services/common'
import {AuthTypes, OpnCommonHeaders} from '@opn-services/common/types/authorization'
import {LogInfo} from '@opn-services/common/utils/logging'
import {PatientUpdatePubSubPayload} from '@opn-services/user/dto/patient'
import {PatientService} from '@opn-services/user/service/patient/patient.service'
import {PubSubEvents, PubSubFunctions} from '@opn-services/common/types/activity-logs'
import {OPNPubSub} from '@opn-common-v1/service/google/pub_sub'
import {AppointmentDBModel} from '@opn-reservation-v1/models/appointment'
import { mapOpnSourceHeader } from '@opn-services/common/utils/registration'

@ApiTags('Patient PubSub')
@Controller('/api/v1/internal/patients/pubsub')
export class PatientPubSubController {
  constructor(private patientService: PatientService) {}

  @Post('/update')
  @ApiAuthType(AuthTypes.Internal)
  async updateProfile(
    @Body() payload: PatientUpdatePubSubPayload,
    @OpnHeaders() opnHeaders: OpnCommonHeaders,
  ): Promise<ResponseWrapper> {
    const {data, attributes} = payload.message
    const publishedData = await OPNPubSub.getPublishedData(data)
    const appointmentData = publishedData['appointment'] as AppointmentDBModel

    let updatePayload = null
    if (appointmentData) {
      updatePayload = appointmentData
    } else {
      updatePayload = publishedData
    }

    LogInfo(PubSubFunctions.updateProfile, PubSubEvents.profileUpdateStarted, {
      attributes,
      publishedData,
      updatePayload, //TODO: remove: for now debugging purpose
    })

    await this.patientService.updateProfileWithPubSub(updatePayload, mapOpnSourceHeader(opnHeaders.opnSourceHeader))

    return ResponseWrapper.actionSucceed()
  }
}
