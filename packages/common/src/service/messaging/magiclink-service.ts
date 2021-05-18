import {EmailService, Mail} from './email-service'
import {MessagingService} from './messaging-service'
import {Config} from '../../utils/config'
import {FirebaseManager} from '../../utils/firebase'
import {auth} from 'firebase-admin'
import {encodeQueryParams} from '../../utils/utils'

// TODO: Deprecated
export class MagicLinkMail extends Mail {
  protected templateId = 1
}

export type MagicLinkMessage = {
  email: string
  name?: string
  meta?: Record<string, string>
  signInLink?: string
}

const magicLinkSettings: auth.ActionCodeSettings = {
  url: Config.get('AUTH_EMAIL_SIGNIN_LINK'),
  handleCodeInApp: true,
  iOS: {bundleId: Config.get('AUTH_EMAIL_SIGNIN_IOS')},
  android: {packageName: Config.get('AUTH_EMAIL_SIGNIN_ANDROID'), installApp: true},
  dynamicLinkDomain: Config.get('AUTH_EMAIL_SIGNIN_DOMAIN'),
}

const magicLinkEmailTemplateId = Config.getInt('AUTH_EMAIL_TEMPLATE_ID', 1)

export class MagicLinkService implements MessagingService<MagicLinkMessage> {
  private emailService = new EmailService()
  private firebaseAuth = FirebaseManager.getInstance().getAdmin().auth()

  send(message: MagicLinkMessage): Promise<unknown> {
    return this.emailService.send({
      templateId: magicLinkEmailTemplateId,
      to: [{email: message.email, name: message.name}],
      params: {
        link: message.meta.signInLink,
        token: message.meta.shortCode,
      },
    })
  }

  generateMagicLink(message: MagicLinkMessage): Promise<string> {
    const additionalQueryParams = encodeQueryParams(message.meta ?? {})
    const url = additionalQueryParams
      ? `${magicLinkSettings.url}?${additionalQueryParams}`
      : magicLinkSettings.url

    return this.firebaseAuth.generateSignInWithEmailLink(message.email, {...magicLinkSettings, url})
  }
}
