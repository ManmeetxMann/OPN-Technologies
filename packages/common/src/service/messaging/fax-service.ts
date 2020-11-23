import fetch from 'node-fetch'
// import {Stream} from 'stream'
// import request from 'request'
import {Config} from '../../utils/config'

const MFAX_TOKEN = Config.get('MFAX_TOKEN')

export class FaxService {
  async send(toNumber: string, filename: string, file: string): Promise<unknown> {
    return fetch('https://api.documo.com/v1/faxes', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${MFAX_TOKEN}`,
        'content-type': 'multipart/form-data',
      },
      body: JSON.stringify({
        // callerId: fromNumber,
        faxNumber: `${toNumber}`,
        coverPage: 'false',
        subject: 'COVID-19 Positive Report',
        attachment: {
          content: file,
          options: {
            filename,
            contentType: 'application/pdf',
          },
        },
      }),
    })
    // return request({
    //   method: 'POST',
    //   url: 'https://api.documo.com/v1/faxes',
    //   headers: {
    //     Authorization: `Basic ${MFAX_TOKEN}`,
    //     'content-type': 'multipart/form-data',
    //   },
    //   formData: {
    //     faxNumber: toNumber,
    //     coverPage: 'false',
    //     subject: 'COVID-19 Positive Report',
    //     attachments: {
    //       value: fileStream,
    //       options: {
    //         filename,
    //         contentType: 'application/pdf',
    //       },
    //     },
    //   },
    // })
  }
}
