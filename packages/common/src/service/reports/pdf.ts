import PdfPrinter from 'pdfmake'
import path from 'path'

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

  async generatePDFStream(params: unknown, tableLayouts: unknown): Promise<Stream> {
    const generatedParams = this.getPDF(params)
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

  private getPDF(content: unknown): unknown {
    return {
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
          width: 500,
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
  }
}
