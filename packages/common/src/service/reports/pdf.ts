import PdfPrinter from 'pdfmake'
import path from 'path'

import {Content, TDocumentDefinitions, TableLayouts} from './pdf-types'

import {Stream} from 'stream'

const getFontSettings = () => ({
  Cambria: {
    normal: path.join(__dirname, '../../static/fonts/Cambria.ttf'),
    bold: path.join(__dirname, '../../static/fonts/CambriaBold.ttf'),
    italics: path.join(__dirname, '../../static/fonts/Cambria.ttf'),
    bolditalics: path.join(__dirname, '../../static/fonts/Cambria.ttf'),
  },
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
})

export class PdfService {
  printer: PdfPrinter = new PdfPrinter(getFontSettings())

  generatePDFStream(params: Content, tableLayouts: TableLayouts, password?: string): Stream {
    const generatedParams = this.getPDF(params, password)
    const stream = new Stream.PassThrough()
    const pdfDoc = this.printer.createPdfKitDocument(generatedParams, {tableLayouts})
    pdfDoc.on('data', (chunk) => stream.push(chunk))
    pdfDoc.on('end', () => stream.end())
    pdfDoc.on('error', (err) => {
      console.error('error creating pdf', err)
      stream.end()
    })
    pdfDoc.end()
    return stream
  }

  generatePDFBase64(
    params: Content,
    tableLayouts: TableLayouts,
    password?: string,
  ): Promise<string> {
    const stream = this.generatePDFStream(params, tableLayouts, password)
    const chunks = []
    stream.on('data', (d) => chunks.push(d))
    return new Promise((resolve) => {
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('base64')))
    })
  }

  private getPDF(content: Content, password?: string): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
      pageSize: 'A4',
      pageMargins: [72, 34, 72, 30],
      styles: {
        'gray-text': {
          color: '#666666',
        },
        black: {
          color: '#000000',
        },
        footer: {
          fontSize: 8,
          lineHeight: 1.4,
          font: 'Helvetica',
          alignment: 'center',
        },
      },
      defaultStyle: {
        color: '#666666',
        font: 'Cambria',
      },
      content,
    }

    if (password !== '') {
      docDefinition.userPassword = password
    }

    return docDefinition
  }
}
