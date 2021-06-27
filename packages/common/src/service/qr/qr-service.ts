import QRCode from 'qrcode'

export class QrService {
  static async generateQrCode(text: string): Promise<string> {
    try {
      return await QRCode.toDataURL(text)
    } catch (err) {
      console.error(err)
    }
  }
}
