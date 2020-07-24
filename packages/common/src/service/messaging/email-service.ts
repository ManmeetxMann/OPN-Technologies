import fetch from 'node-fetch'
import path from 'path'
import dotenv from 'dotenv'
dotenv.config({path: path.resolve(__dirname, '../../../.env')})

export interface MailInfo {
  email: string
  name?: string
  parameters: unknown
}

export abstract class Mail {
  private recipient: MailInfo
  private static readonly APIKEY = process.env.EMAIL_PROVIDER_API_KEY
  private static readonly APIURL = process.env.EMAIL_PROVIDER_API_URL

  protected abstract templateId: number

  constructor(recipient: MailInfo) {
    this.recipient = recipient
  }

  async send(): Promise<void> {
    const email = {
      to: [
        {
          email: this.recipient.email,
          name: this.recipient.name,
        },
      ],
      templateId: this.templateId,
      params: this.recipient.parameters,
    }

    // FYI: Their Node and Typescript libraries are garbage!
    await fetch(Mail.APIURL, {
      method: 'post',
      body: JSON.stringify(email),
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': Mail.APIKEY,
      },
    })
    // const json = await response.json();
    // console.log(json)
  }
}
