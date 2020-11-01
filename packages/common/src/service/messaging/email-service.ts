import {sendWithTemplate} from './send-email'
import {MessagingService} from './messaging-service'
import {Config} from '../../utils/config'
import fetch from 'node-fetch'

// TODO: Start-deprecate
export interface MailInfo {
  email: string
  name?: string
  parameters: unknown
}

export abstract class Mail {
  private recipient: MailInfo

  protected abstract templateId: number

  constructor(recipient: MailInfo) {
    this.recipient = recipient
  }

  async send(): Promise<void> {
    await sendWithTemplate(
      this.recipient.name,
      this.recipient.email,
      this.templateId,
      this.recipient.parameters,
    )
  }
}
// TODO: End-Deprecate

type EmailMessageParticipant = {
  email: string
  name?: string
}

type EmailAttachment = {
  content?: string
  url?: string
  name: string
}

type EmailMessage = {
  to: EmailMessageParticipant[]
  templateId?: number
  textContent?: string
  subject?: string
  params?: Record<string, unknown>
  sender?: EmailMessageParticipant
  attachment?: EmailAttachment[]
  bcc?: EmailMessageParticipant[]
}

const APIKEY = Config.get('EMAIL_PROVIDER_API_KEY')
const APIURL = Config.get('EMAIL_PROVIDER_API_URL')

export class EmailService implements MessagingService<EmailMessage> {
  send(message: EmailMessage): Promise<unknown> {
    return fetch(APIURL, {
      method: 'post',
      body: JSON.stringify(message),
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': APIKEY,
      },
    })
  }
}
