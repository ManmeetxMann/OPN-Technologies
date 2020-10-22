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
  name: string
}

type EmailAttachment = {
  content?: string
  url?: string
  name: string
}

type Bcc = {
  email: string
  name?: string
}

type EmailMessage = {
  to: EmailMessageParticipant[]
  templateId: number
  params?: Record<string, unknown>
  sender?: EmailMessageParticipant
  attachment?: EmailAttachment[]
  bcc?: Bcc[]
}

const APIKEY = Config.get('EMAIL_PROVIDER_API_KEY')
const APIURL = Config.get('EMAIL_PROVIDER_API_URL')

export class EmailService implements MessagingService<EmailMessage> {
  send(message: EmailMessage): Promise<unknown> {
    const body = {...message}
    return fetch(APIURL, {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': APIKEY,
      },
    })
  }
}
