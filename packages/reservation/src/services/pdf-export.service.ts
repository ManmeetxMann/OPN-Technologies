import PdfPrinter from 'pdfmake'

import {TestResultsDTOForEmail} from '../models/appoinment'
import {
  getMainTableLayout,
  getResultTableLayout,
  getDocDefinition,
  getFontDefinition,
} from '../templates/test-result-template'

export class PdfExportService {
  async generateTestResultPdf(testResults: TestResultsDTOForEmail): Promise<string> {
    const fonts = getFontDefinition()
    const tableLayouts = {
      mainTable: getMainTableLayout(),
      resultTable: getResultTableLayout(),
    }

    const printer = new PdfPrinter(fonts)
    const docDefinition = getDocDefinition(testResults)

    return new Promise<string>((resolve, reject) => {
      const buf = []

      const pdfDoc = printer.createPdfKitDocument(docDefinition, {tableLayouts})

      pdfDoc.on('data', (chunk) => {
        buf.push(chunk)
      })

      pdfDoc.on('end', () => {
        const buffer = Buffer.concat(buf)
        resolve(buffer.toString('base64'))
      })

      pdfDoc.on('error', (error) => {
        reject(error)
      })

      pdfDoc.end()
    })
  }
}
