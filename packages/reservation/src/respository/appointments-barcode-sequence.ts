import {AppoinmentBarCodeSequenceDBModel} from '../models/appointment'

import {Config} from '../../../common/src/utils/config'
import {firebaseAdmin} from '../../../common/src/utils/firebase'

export class AppointmentsBarCodeSequence {
  public rootPath = 'appointment-barcode-sequence'
  private firestore
  constructor() {
    this.firestore = firebaseAdmin.firestore()
  }

  /**
   * Use lib firestore directly not firestore-simple for transactions
   */
  public async getNextBarCode(): Promise<null | AppoinmentBarCodeSequenceDBModel> {
    const prefix = Config.get('BARCODE_SEQ_PREFIX') ?? 'TEST'
    const barcodesDocument = this.firestore.collection(this.rootPath).doc(prefix)

    const newBarCode = await this.firestore.runTransaction(async (transaction) => {
      const doc = await transaction.get(barcodesDocument)
      const docData = doc.data()
      let newBarCode = null
      if (!docData) {
        newBarCode = 1000000000
        await transaction.set(barcodesDocument, {barCodeNumber: newBarCode})
      } else {
        newBarCode = docData.barCodeNumber + 1
        await transaction.update(barcodesDocument, {barCodeNumber: newBarCode})
      }
      return newBarCode
    })

    return {id: prefix, barCodeNumber: newBarCode}
  }
}
