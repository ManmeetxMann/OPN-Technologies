import request from 'request';
import {Config} from '../../utils/config'

const MFAX_TOKEN = Config.get('MFAX_TOKEN')

export class FaxService {
  async send(toNumber: string, fileName: string, file): Promise<any> {

    return new Promise((resolve, reject) => {
      return request({
        method: 'POST',
        url: 'https://api.documo.com/v1/faxes',
        headers: {
          Authorization: `Basic ${MFAX_TOKEN}`,
        },
        formData: {
          faxNumber: `${toNumber}`,
          coverPage: 'false',
          recipientName: 'StayOPN',
          subject: 'COVID-19 Positive Report',
          attachment: {
            value: file,
            options: {
              filename: fileName,
            },
          },
        },
      }, (error, response, body) => {
        if (error) {
          return reject(error)
        }

        resolve(JSON.parse(body))
      })
    })
  }
}
