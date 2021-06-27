import QRCode from 'qrcode'
import {LogError} from '../../utils/logging-setup'
import {Content} from '../reports/pdf-types'

export class QrService {
  static async generateQrCode(text: string): Promise<string> {
    try {
      return QRCode.toDataURL(text)
    } catch (err) {
      LogError('generateQrCode', 'generateQrCode', {...err})
    }
  }

  static getQrDataForPDFReport(qr: string, width: number, height: number): Content {
    return {
      image: qr,
      width,
      height,
      alignment: 'center',
    }
  }
}
