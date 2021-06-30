import PdfPrinter from 'pdfmake'
import path from 'path'

import {Content, TDocumentDefinitions, TableLayouts} from './pdf-types'

import {Stream} from 'stream'
import {LogInfo} from '../../utils/logging-setup'

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
  BrutalType: {
    normal: path.join(__dirname, '../../static/fonts/BrutalType-Black.otf'),
    bold: path.join(__dirname, '../../static/fonts/BrutalType-Bold.otf'),
  },
  BrutalTypeRegular: {
    normal: path.join(__dirname, '../../static/fonts/BrutalType-Regular.otf'),
  },
  BrutalTypeLight: {
    normal: path.join(__dirname, '../../static/fonts/BrutalType-Light.otf'),
  },
  DMSans: {
    normal: path.join(__dirname, '../../static/fonts/DMSans-Regular.ttf'),
    bold: path.join(__dirname, '../../static/fonts/DMSans-Bold.ttf'),
  },
  DMSansItalic: {
    normal: path.join(__dirname, '../../static/fonts/DMSans-Italic.ttf'),
    bold: path.join(__dirname, '../../static/fonts/DMSans-BoldItalic.ttf'),
  },
  DMSansMedium: {
    normal: path.join(__dirname, '../../static/fonts/DMSans-Medium.ttf'),
    bold: path.join(__dirname, '../../static/fonts/DMSans-MediumItalic.ttf'),
  },
  PTSerif: {
    normal: path.join(__dirname, '../../static/fonts/PTSerif-Regular.ttf'),
    bold: path.join(__dirname, '../../static/fonts/PTSerif-Bold.ttf'),
    italics: path.join(__dirname, '../../static/fonts/PTSerif-Italic.ttf'),
    bolditalics: path.join(__dirname, '../../static/fonts/PTSerif-BoldItalic.ttf'),
  },
  SFPro: {
    normal: path.join(__dirname, '../../static/fonts/SFPro.ttf'),
    bold: path.join(__dirname, '../../static/fonts/SFPro-Bold.ttf'),
  },
})

export class PdfService {
  printer: PdfPrinter = new PdfPrinter(getFontSettings())

  generatePDFStream(
    params: Content,
    tableLayouts: TableLayouts,
    password?: string,
    pageSize?: {height: number; width: number},
    pageMargin?: number,
    background?: Content,
  ): Stream {
    // console.log(pageSize.width + ' ' + pageSize.height)
    const generatedParams = this.getPDF(params, password, pageSize, pageMargin, background)
    const stream = new Stream.PassThrough()
    const pdfDoc = this.printer.createPdfKitDocument(generatedParams, {tableLayouts})
    pdfDoc.on('data', (chunk) => stream.push(chunk))
    pdfDoc.on('end', () => {
      stream.end()
      LogInfo('generatePDFStream', 'PDFSuccessfullyGenerated', {})
    })
    pdfDoc.on('error', (err) => {
      LogInfo('generatePDFStream', 'FailToGeneratePDF', {err})
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

  private getPDF(
    content: Content,
    password?: string,
    PageSize?: {height: number; width: number},
    pageMargin?: number,
    background?: Content,
  ): TDocumentDefinitions {
    const docDefinition: TDocumentDefinitions = {
      pageSize: PageSize || 'A4',
      pageMargins: pageMargin == undefined ? [72, 34, 72, 30] : pageMargin,
      styles: {
        'gray-text': {
          color: '#666666',
        },
        black: {
          color: '#000000',
        },
        footer: {
          fontSize: 7,
          lineHeight: 1.4,
          font: 'Helvetica',
          alignment: 'center',
        },
        disclaimer: {
          fontSize: 7,
          font: 'Helvetica',
        },
      },
      defaultStyle: {
        color: '#666666',
        font: 'Cambria',
        fontSize: 11,
      },
      background,
      content,
    }

    if (password !== '') {
      docDefinition.userPassword = password
    }

    return docDefinition
  }
}
