import fetch from 'node-fetch'
import {Config} from '../../utils/config'

const APIKEY = Config.get('EMAIL_PROVIDER_API_KEY')
const APIURL = Config.get('EMAIL_PROVIDER_API_URL')
const FROM_ADDRESS = Config.get('EMAIL_FROM_ADDRESS')
const FROM_NAME = Config.get('EMAIL_FROM_NAME')

const sendRequest = (body: unknown) =>
  fetch(APIURL, {
    method: 'post',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      accept: 'application/json',
      'api-key': APIKEY,
    },
  })

export async function send(
  toEmail: string,
  subject: string,
  body: string,
  htmlBody?: string,
): Promise<unknown> {
  const email = {
    sender: {
      email: FROM_ADDRESS,
      name: FROM_NAME,
    },
    to: [
      {
        email: toEmail,
      },
    ],
    subject,
    textContent: body,
    htmlContent: htmlBody ?? body.replace('\n', '<br />'),
  }
  return sendRequest(email)
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
  return sendRequest(email)
}
