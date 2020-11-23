import {Stream} from 'stream'
// import fetch from 'node-fetch'
// import FormData from 'form-data'
import {Config} from '../../utils/config'
import {PdfService} from '../../service/reports/pdf'
import request from 'request'

const MFAX_TOKEN = Config.get('MFAX_TOKEN')

export class FaxService {
  private pdfService = new PdfService()

  async send(toNumber: string, filename: string, fileStream: Stream): Promise<void> {
    // const formData = new FormData()

    // formData.append('attachments', fileStream);
    // formData.append('blah', 42);

    // const response = await fetch('https://api.documo.com/v1/faxes', {
    //     method: 'POST',
    //     headers: {
    //         Authorization: `Basic ${MFAX_TOKEN}`,
    //         'content-type': 'multipart/form-data'
    //     },
    //     formData: {
    //         // callerId: fromNumber,
    //         faxNumber: toNumber,
    //         coverPage: 'false',
    //         subject: 'COVID-19 Positive Report',
    //         attachments: {
    //             value: fileStream,
    //             options: {
    //                 filename,
    //                 contentType: 'application/pdf'
    //             }
    //         }
    //     }
    // })
    return request({
      method: 'POST',
      url: 'https://api.documo.com/v1/faxes',
      headers: {
        Authorization: `Basic ${MFAX_TOKEN}`,
        'content-type': 'multipart/form-data',
      },
      formData: {
        faxNumber: toNumber,
        coverPage: 'false',
        subject: 'COVID-19 Positive Report',
        attachments: {
          value: fileStream,
          options: {
            filename,
            contentType: 'application/pdf',
          },
        },
      },
    })
  }
}
