import {EmailService as BaseService} from '../../../common/src/service/messaging/email-service'

export class EmailService {
  private emailService = new BaseService()

  sendGroupReport(email: string, name: string, publicUrl: string): Promise<unknown> {
    return this.emailService.send({
      to: [{email, name}],
      textContent: `Report available at ${publicUrl}`,
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
