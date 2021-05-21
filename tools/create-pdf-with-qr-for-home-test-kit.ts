/**
 *  Script to generate PDF file with QR codes from Rapid Firestore RapidHomeKitCodes collection
 */
import moment from 'moment-timezone'
import fs from 'fs'
import admin, {initializeApp, credential} from 'firebase-admin'
import {PdfService} from '../packages/common/src/service/reports/pdf'
import {
  Content,
  ContentQr,
  TableLayouts,
  Column,
} from '../packages/common/src/service/reports/pdf-types'
import {Config} from '../packages/common/src/utils/config'
import {makeFirestoreTimestamp} from '../packages/reservation/src/utils/datetime.helper'
const DOMAIN = 'https://fhathome.com/homekit'
const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const db = admin.firestore()
const collection = db.collection('rapid-home-kit-codes')
const pdfService = new PdfService()
const pointsToInches = 72
const contentFontSize = 8

const tableLayouts: TableLayouts = {
  mainTable: {
    hLineWidth: (): number => 1,
    vLineWidth: (): number => 1,
    hLineColor: (): string => '#CCCCCC',
    vLineColor: (): string => '#CCCCCC',
    paddingTop: (): number => 5,
    paddingBottom: (): number => 5,
  },
  resultTable: {
    hLineWidth: (): number => 1,
    vLineWidth: (): number => 1,
    hLineColor: (): string => '#B7B7B7',
    vLineColor: (): string => '#B7B7B7',
    paddingTop: (): number => 5,
    paddingBottom: (): number => 5,
  },
}

const pageSize = {
  height: 1.3 * pointsToInches,
  width: 4.3 * pointsToInches,
}

const pageMargin = 0

function makePDFContent(code: string): Content[] {
  const qrContent: ContentQr = {
    qr: `${DOMAIN}/${code}`,
    fit: 63,
    margin: [35, 15, 10, 30],
  }

  const urlContent: Content = {
    text: [
      {text: 'Visit: ', color: '#000000', font: 'BrutalTypeRegular'},
      {text: DOMAIN, color: '#cb9b52', bold: true, font: 'BrutalType'},
    ],
    alignment: 'left',
    margin: 0,
    lineHeight: 3,
    fontSize: contentFontSize,
  }

  const codeContent: Content = {
    text: [
      {text: 'Enter code: ', color: '#000000', font: 'BrutalTypeRegular'},
      {text: code, color: '#cb9b52', bold: true, font: 'BrutalType'},
    ],
    margin: 0,
    alignment: 'left',
    lineHeight: 0,
    fontSize: contentFontSize,
  }

  const columnContainer: Column = {
    columns: [
      qrContent,
      {
        width: 'auto',
        text: 'OR',
        bold: true,
        alignment: 'center',
        lineHeight: 2,
        fontSize: contentFontSize + 4,
        color: '#cb9b52',
        margin: [5, 40, 5, 40],
        font: 'BrutalType',
      },
      {
        width: '100%',
        text: [urlContent, '\n', codeContent],
        margin: [15, 30, 0, 25],
        alignment: 'left',
        lineHeight: 2,
        fontSize: contentFontSize + 1,
      },
      {
        width: 95,
        absolutePosition: {x: 0, y: 10},
        font: 'BrutalTypeLight',
        margin: [0, 5, 5, 5],
        svg:
          `
        <svg>
          <text
            dx="4 4 4 4 4 4 4 4 4 4 4"
            transform="translate(24, 70) rotate(-90)"
            style="font-size: ` +
          (contentFontSize + 3) +
          `;"
          >
            S C A N
          </text>
        </svg>
      `,
      },
    ],
  }

  return [columnContainer]
}

function createTempDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

async function main() {
  const dir = __dirname + '/pdfs'
  createTempDirectory(dir)
  const codesToPrintSnapshot = await collection.where('printed', '==', false).get()

  const pdfPromises = codesToPrintSnapshot.docs.map(async (doc) => {
    const code = doc.data().code
    const file = `${dir}/${code}.pdf`
    const stream = pdfService.generatePDFStream(
      makePDFContent(code),
      tableLayouts,
      undefined,
      pageSize,
      pageMargin,
    )

    return new Promise((resolve, reject) => {
      const writeStream = stream.pipe(fs.createWriteStream(file))

      writeStream.on('close', async () => {
        await doc.ref.update({
          printed: true,
          printedOn: makeFirestoreTimestamp(moment().toISOString()),
        })
        resolve(file)
      })

      writeStream.on('error', reject)
    })
  })

  return Promise.all(pdfPromises)
}

main()
  .then((result) => {
    console.log('PDFs generated:', result)
  })
  .catch((e) => console.warn('PDF Generation Failed: ', e))
