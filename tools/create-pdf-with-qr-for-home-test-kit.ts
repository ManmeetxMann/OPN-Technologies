/**
 *  Script to generate PDF file with QR codes from Rapid Firestore RapidHomeKitCodes collection
 */
import moment from 'moment-timezone'
import fs from 'fs'
import admin, {initializeApp, credential} from 'firebase-admin'
import {PdfService} from '../packages/common/src/service/reports/pdf'
import {Content, ContentQr, TableLayouts} from '../packages/common/src/service/reports/pdf-types'
import {Config} from '../packages/common/src/utils/config'
import {makeFirestoreTimestamp} from '../packages/reservation/src/utils/datetime.helper'

const serviceAccount = JSON.parse(Config.get('FIREBASE_ADMINSDK_SA'))
initializeApp({
  credential: credential.cert(serviceAccount),
})

const db = admin.firestore()
const collection = db.collection('rapid-home-kit-codes')
const pdfService = new PdfService()

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

function makePDFContent(code: string): Content[] {
  const qrContent: ContentQr = {
    qr: code,
    alignment: 'center',
    margin: [0, 5, 0, 0],
  }

  const codeContent: Content = {
    text: code,
    bold: true,
    margin: [0, 10, 0, 0],
    alignment: 'center',
    lineHeight: 2,
    fontSize: 16,
  }

  return [qrContent, codeContent]
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
    const stream = pdfService.generatePDFStream(makePDFContent(code), tableLayouts)

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
