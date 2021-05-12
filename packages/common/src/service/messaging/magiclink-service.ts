import {EmailService, Mail} from './email-service'
import {MessagingService} from './messaging-service'
import {Config} from '../../utils/config'
import {FirebaseManager} from '../../utils/firebase'
import {auth} from 'firebase-admin'
import {encodeQueryParams} from '../../utils/utils'
import {OpnSources} from '../../types/authorization'

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

const opnMagicLinkSettings: auth.ActionCodeSettings = {
  url: Config.get('AUTH_EMAIL_SIGNIN_LINK'),
  handleCodeInApp: true,
  iOS: {bundleId: Config.get('AUTH_EMAIL_SIGNIN_IOS')},
  android: {packageName: Config.get('AUTH_EMAIL_SIGNIN_ANDROID'), installApp: true},
  dynamicLinkDomain: Config.get('AUTH_EMAIL_SIGNIN_DOMAIN'),
}

const fhHealthMagicLinkSettings: auth.ActionCodeSettings = {
  url: Config.get('FH_AUTH_EMAIL_SIGNIN_LINK'),
  handleCodeInApp: true,
  iOS: {bundleId: Config.get('FH_AUTH_EMAIL_SIGNIN_IOS')},
  android: {packageName: Config.get('FH_AUTH_EMAIL_SIGNIN_ANDROID'), installApp: true},
  dynamicLinkDomain: Config.get('FH_AUTH_EMAIL_SIGNIN_DOMAIN'),
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

  generateMagicLink(message: MagicLinkMessage, applicationName: string): Promise<string> {
    const additionalQueryParams = encodeQueryParams(message.meta ?? {})
    let linkSettings
    if (applicationName === OpnSources.OPN) {
      linkSettings = opnMagicLinkSettings
    } else if (applicationName === OpnSources.FHHealth) {
      linkSettings = fhHealthMagicLinkSettings
    }
    const url = additionalQueryParams
      ? `${linkSettings.url}?${additionalQueryParams}`
      : linkSettings.url

    return this.firebaseAuth.generateSignInWithEmailLink(message.email, {...linkSettings, url})
  }
}
