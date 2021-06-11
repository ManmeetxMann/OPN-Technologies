import {LogInfo} from '../../../common/src/utils/logging-setup'
import {EmailService as BaseService} from '../../../common/src/service/messaging/email-service'

export class EmailService {
  private emailService = new BaseService()

  sendGroupReport(email: string, name: string, publicUrl: string): Promise<unknown> {
    LogInfo('sendGroupReport', 'SendGroupReport', {publicUrl})

    return this.emailService.send({
      to: [{email, name}],
      textContent: `Click <a href="${publicUrl}">here</a> to download your report`,
      subject: 'OPN Report',
      sender: {
        email: 'no-reply@email.stayopn.net',
        name: 'OPN Team',
      },
      bcc: [
        {
          email: 'reports@stayopn.com',
        },
      ],
    })
  }
}
