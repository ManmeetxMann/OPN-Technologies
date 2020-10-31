import crypto from 'crypto'
import {Config} from '../../utils/config'

export class EncryptionService {
  private encryptionKey = Config.get('ENCRYPTION_KEY')
  private encryptionIV = Config.get('ENCRYPTION_IV')
  private algorithm = 'aes-256-cbc'

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey),
      this.encryptionIV,
    )
    const encrypted = cipher.update(text)
    const encryptedExt = Buffer.concat([encrypted, cipher.final()])

    return encryptedExt.toString('hex')
  }

  decrypt(text: string): string {
    const encryptedText = Buffer.from(text, 'hex')
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      Buffer.from(this.encryptionKey),
      this.encryptionIV,
    )
    const decrypted = decipher.update(encryptedText)
    const decryptedExt = Buffer.concat([decrypted, decipher.final()])

    return decryptedExt.toString()
  }
}
