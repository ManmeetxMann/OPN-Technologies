import * as crypto from 'crypto'

export class EncryptionService {
  private encryptionKey: Buffer
  private encryptionIV = crypto.randomBytes(16)
  private algorithm = 'aes-256-cbc'

  constructor(encryptionKey: string) {
    this.encryptionKey = Buffer.from(encryptionKey)
  }

  encrypt(text: string): string {
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, this.encryptionIV)
    const encrypted = cipher.update(text)
    const encryptedExt = Buffer.concat([encrypted, cipher.final()])

    return encryptedExt.toString('hex')
  }

  decrypt(text: string): string {
    const encryptedText = Buffer.from(text, 'hex')
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, this.encryptionIV)
    const decrypted = decipher.update(encryptedText)
    const decryptedExt = Buffer.concat([decrypted, decipher.final()])

    return decryptedExt.toString()
  }
}
