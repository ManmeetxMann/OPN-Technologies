import {EmailService as BaseService} from '../../../common/src/service/messaging/email-service'

export class EmailService {
  private emailService = new BaseService()

  sendGroupReport(email: string, name: string, attachmentBase64: string): Promise<unknown> {
    return this.emailService.send({
      to: [{email, name}],
      textContent: 'Report attached',
      subject: 'OPN Report',
      sender: {
        email: 'no-reply@email.stayopn.net',
        name: 'OPN Team',
      },
      attachment: [
        {
          content: attachmentBase64,
          name: `OPN Report.pdf`,
        },
      ],
      bcc: [
        {
          email: 'reports@stayopn.com',
        },
      ],
    })
  }
}
