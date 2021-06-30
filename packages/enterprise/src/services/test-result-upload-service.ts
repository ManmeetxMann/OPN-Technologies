import BucketService from '../../../common/src/service/google/bucket'
import {Config} from '../../../common/src/utils/config'
import {LogInfo} from '../../../common/src/utils/logging-setup'
const linkExpirationTime = Number(Config.get('QR_LINK_EXPIRATION_TIME'))

import {Stream} from 'stream'
import {EncryptionService} from '../../../common/src/service/encryption/encryption-service'

const pdfUploadEncryptionKey = Config.get('PDF_UPLOAD_ENCRYPTION_KEY')
const testResultBucketName = Config.get('TEST_RESULTS_BUCKET_NAME')

export default class {
  private testResultBucketService = new BucketService(testResultBucketName)

  generateFileName(testResultId: string): string {
    const key = testResultId.concat(String(Date.now()))
    const encryptionService = new EncryptionService(pdfUploadEncryptionKey)
    return `${encryptionService.encrypt(key)}.pdf`
  }

  uploadPDFResult(stream: Stream, fileName: string): Promise<string> {
    LogInfo('uploadPDFResult', 'PDFResultUpload', {fileName, testResultBucketName})
    return this.testResultBucketService.uploadFile(fileName, stream)
  }

  getSignedInUrl(fileName: string): Promise<string> {
    return this.testResultBucketService.generateV4ReadSignedUrl(fileName, linkExpirationTime)
  }
}
