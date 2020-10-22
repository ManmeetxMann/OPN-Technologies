import fs from 'fs'
import pdf from 'html-pdf'
import handlebars from 'handlebars'

import path from 'path'
import {Stream} from 'stream'

export class PdfExportService {
  private templatePath = path.join(__dirname, '../templates/user-report.html')

  async generateUserReportPDF(userReport: unknown): Promise<Stream> {
    const html = fs.readFileSync(this.templatePath, {encoding: 'utf-8'})

    const template = handlebars.compile(html)
    const htmlToExport = template(userReport)

    return new Promise<Stream>((resolve, reject) => {
      pdf.create(htmlToExport).toStream((err, stream) => {
        if (err) {
          reject(err)
        } else {
          resolve(stream)
        }
      })
    })
  }
}
