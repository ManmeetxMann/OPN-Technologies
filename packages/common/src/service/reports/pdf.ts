import fs from 'fs'
import pdf from 'html-pdf'
import handlebars from 'handlebars'

import {Stream} from 'stream'

export class PdfService {
  async generatePDFStream(templatePath: string, handlebarsParams: unknown): Promise<Stream> {
    const htmlToExport = this.getHtml(templatePath, handlebarsParams)
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
  async generatePDFBase64(templatePath: string, handlebarsParams: unknown): Promise<string> {
    const htmlToExport = this.getHtml(templatePath, handlebarsParams)
    return new Promise<string>((resolve, reject) => {
      pdf.create(htmlToExport).toBuffer((err, buffer) => {
        if (err) {
          reject(err)
        } else {
          resolve(buffer.toString('base64'))
        }
      })
    })
  }
  private getHtml(templatePath: string, handlebarsParams: unknown): string {
    const html = fs.readFileSync(templatePath, {encoding: 'utf-8'})
    const template = handlebars.compile(html)
    // TODO: https://www.npmjs.com/advisories/1095
    // library claims to have solved this but should verify
    return template(handlebarsParams)
  }
}
