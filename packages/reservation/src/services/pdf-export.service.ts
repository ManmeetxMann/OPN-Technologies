import fs from 'fs'
import path from 'path'
import HTML5ToPDF from 'html5-to-pdf'
import handlebars from 'handlebars'
import moment from 'moment'

import {TestResultsDTOForEmail} from '../models/appoinment'

export class PdfExportService {
  private exportFilePath = '../../export'
  private templatePath = '../templates/test-result.html'

  async generateTestResultPdf(testResults: TestResultsDTOForEmail): Promise<string> {
    const html = fs.readFileSync(this.templatePath, {encoding: 'utf-8'})

    const template = handlebars.compile(html)

    const htmlToExport = template({
      ...testResults,
      createTime: moment().format('DD. MMMM YYYY'),
    })

    const fileName = `PHHealth_${moment().format('YYYYMMDDHHmmss')}.pdf`
    const outputPath = path.join(`${this.exportFilePath}/${fileName}`)

    const htmL5ToPDF = new HTML5ToPDF({
      inputBody: htmlToExport,
      outputPath,
      templatePath: path.join('public'),
      options: {
        pageSize: 'A4',
        printBackground: true,
        // @ts-ignore
        launchOptions: {
          width: 700,
          height: 3000,
        },
      },
    })

    await htmL5ToPDF.start()
    await htmL5ToPDF.build()
    await htmL5ToPDF.close()

    return fileName
  }
}
