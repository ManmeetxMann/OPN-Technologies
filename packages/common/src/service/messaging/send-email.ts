import fetch from 'node-fetch'
import {Config} from '../../utils/config'

const APIKEY = Config.get('EMAIL_PROVIDER_API_KEY')
const APIURL = Config.get('EMAIL_PROVIDER_API_URL')

export async function send(
  toEmail: string,
  subject: string,
  body: string,
  htmlBody?: string,
): Promise<unknown> {
  const email = {
    sender: {
      email: 'no-reply@email.stayopn.net',
      name: 'OPN Team',
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject,
    textContent: body,
    htmlContent: htmlBody ?? body,
  }
  return fetch(APIURL, {
    method: 'post',
    body: JSON.stringify(email),
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'api-key': APIKEY,
    },
  })
}

export async function sendWithTemplate(
  toName: string,
  toEmail: string,
  templateId: number,
  params: unknown,
): Promise<unknown> {
  const email = {
    sender: {
      email: 'no-reply@email.stayopn.net',
      name: 'OPN Team',
    },
    to: [
      {
        name: toName,
        email: toEmail,
      },
    ],
    templateId,
    params,
  }
  return fetch(APIURL, {
    method: 'post',
    body: JSON.stringify(email),
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'api-key': APIKEY,
    },
  })
}
