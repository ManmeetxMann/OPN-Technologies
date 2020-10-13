import {EmailService, Mail} from './email-service'
import {MessagingService} from './messaging-service'
import {Config} from '../../utils/config'
import {FirebaseManager} from '../../utils/firebase'
import {auth} from 'firebase-admin'

// TODO: Depracated
export class MagicLinkMail extends Mail {
  protected templateId = 1
}

export type MagicLinkMessage = {
  email: string
  name?: string
}

const magicLinkSettings: auth.ActionCodeSettings = {
  url: Config.get('AUTH_EMAIL_SIGNIN_LINK'),
  handleCodeInApp: true,
  iOS: {bundleId: Config.get('AUTH_EMAIL_SIGNIN_IOS')},
  android: {packageName: Config.get('AUTH_EMAIL_SIGNIN_ANDROID'), installApp: true},
  dynamicLinkDomain: Config.get('AUTH_EMAIL_SIGNIN_DOMAIN'),
}

const magicLinkEmailTemplateId = (Config.get('AUTH_EMAIL_TEMPLATE_ID') ?? 1) as number

export class MagicLinkService implements MessagingService<MagicLinkMessage> {
  private emailService = new EmailService()
  private firebaseAuth = FirebaseManager.getInstance().getAdmin().auth()

  send(message: MagicLinkMessage): Promise<unknown> {
    return this.firebaseAuth
      .generateSignInWithEmailLink(message.email, magicLinkSettings)
      .then((signInLink) =>
        this.emailService.send({
          templateId: magicLinkEmailTemplateId,
          to: [{email: message.email, name: message.name}],
          params: {
            link: signInLink,
          },
        }),
      )
  }
}
