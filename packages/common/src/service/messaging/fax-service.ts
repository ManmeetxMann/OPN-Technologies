import fetch from 'node-fetch'
import {Config} from '../../utils/config'

const MFAX_TOKEN = Config.get('MFAX_TOKEN')
const MFAX_CALLERID = Config.get('MFAX_CALLERID')

export class FaxService {
  async send(toNumber: string, filename: string, file: string): Promise<unknown> {
    return fetch('https://api.documo.com/v1/faxes', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${MFAX_TOKEN}`,
        'Content-Type': 'multipart/form-data',
      },
      body: JSON.stringify({
        callerId: MFAX_CALLERID,
        faxNumber: `${toNumber}`,
        coverPage: 'false',
        recipientName: 'StayOPN',
        subject: 'COVID-19 Positive Report',
        attachment: {
          value: file,
          content: file,
          options: {
            filename,
            contentType: 'application/pdf',
          },
        },
      }),
    })
  }
}
