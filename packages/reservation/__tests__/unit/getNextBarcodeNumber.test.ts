import {AppoinmentService} from '../../src/services/appoinment.service'

jest.setTimeout(7000)

const appoinmentService = new AppoinmentService()

describe('barcode number generation', () => {
  test('parallel calls should return unique barcodes', async () => {
    const result = await Promise.all([
      appoinmentService.getNextBarCodeNumber(),
      appoinmentService.getNextBarCodeNumber(),
      appoinmentService.getNextBarCodeNumber(),
      appoinmentService.getNextBarCodeNumber(),
      appoinmentService.getNextBarCodeNumber(),
    ])

    const uniqueBarcodes = new Set(result)
    expect(uniqueBarcodes.size).toBe(5)
  })
})
