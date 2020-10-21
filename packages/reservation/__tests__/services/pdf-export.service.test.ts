import path from 'path'
import {PdfExportService} from '../../src/services/pdf-export.service'

enum ResultTypes {
  Positive,
  Negative,
}

import fs from 'fs'
const pdfExportService = new PdfExportService()
describe('HTML To PDF', () => {
  //This test is mainly used to validate generated PDF
  test('Validate PDF is created successfully', async () => {
    const pdfName = path.join(__dirname, 'test_results.pdf')
    await pdfExportService
      .generateTestResultPdf({
        barCode: 'TEST1',
        result: ResultTypes.Positive,
        famEGene: 'fam1',
        famCt: 'famCt1',
        calRed61RdRpGene: '1',
        calRed61Ct: '2',
        quasar670NGene: '3',
        quasar670Ct: '44',
        hexIC: 'hexIC',
        hexCt: 'hexCt',
        firstName: 'HSG',
        lastName: 'GIL',
        email: 'string',
        phone: 1121212121,
        dateOfBirth: 'string',
        registeredNursePractitioner: 'string',
        dateOfAppointment: 'string',
        appointmentId: 121212,
      })
      .then((result) => {
        const buf = new Buffer(result, 'base64')
        fs.writeFile(pdfName, buf, function (err) {
          if (err) throw err
        })
      })

    expect(fs.existsSync(pdfName)).toBe(true)
  })
})
