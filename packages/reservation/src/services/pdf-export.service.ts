import fs from 'fs'
import pdf from 'html-pdf'
import handlebars from 'handlebars'

import {ResultTypes, TestResultsDTOForEmail} from '../models/appoinment'
import path from 'path'

export class PdfExportService {
  private templatePath = path.join(__dirname, '../templates/test-result.html')

  async generateTestResultPdf(
    testResults: TestResultsDTOForEmail,
    todaysDate: string,
  ): Promise<string> {
    const html = fs.readFileSync(this.templatePath, {encoding: 'utf-8'})

    const template = handlebars.compile(html)
    const htmlToExport = template({
      ...testResults,
      result: testResults.result === ResultTypes.Positive,
      createTime: todaysDate,
    })

    return new Promise<string>((resolve, reject) => {
      pdf
        .create(htmlToExport, {
          width: '21cm',
          height: '32cm',
          type: 'pdf',
        })
        .toBuffer((err, buffer) => {
          if (err) {
            reject(err)
          }
          resolve(buffer.toString('base64'))
        })
    })
  }
}
