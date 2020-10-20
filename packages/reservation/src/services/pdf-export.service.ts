import fs from 'fs'
import pdf from 'html-pdf'
import handlebars from 'handlebars'
import moment from 'moment'

import {TestResultsDTOForEmail} from '../models/appoinment'

export class PdfExportService {
  private templatePath = '../templates/test-result.html'

  async generateTestResultPdf(testResults: TestResultsDTOForEmail): Promise<string> {
    const html = fs.readFileSync(this.templatePath, {encoding: 'utf-8'})

    const template = handlebars.compile(html)

    const htmlToExport = template({
      ...testResults,
      createTime: moment().format('DD. MMMM YYYY'),
    })

    return new Promise<string>((resolve, reject) => {
      pdf.create(htmlToExport).toBuffer((err, buffer) => {
        if (err) {
          reject(err)
        }
        resolve(buffer.toString('base64'))
      })
    })
  }
}
