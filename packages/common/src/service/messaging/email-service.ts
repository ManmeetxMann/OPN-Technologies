import {sendWithTemplate} from './send-email'

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
