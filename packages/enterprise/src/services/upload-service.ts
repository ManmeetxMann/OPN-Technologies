import BucketService from '../../../common/src/service/google/bucket'
import {Config} from '../../../common/src/utils/config'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import {LogInfo} from '../../../common/src/utils/logging-setup'
import DataStore from '../../../common/src/data/datastore'

import {Stream} from 'stream'
import {EncryptionService} from '../../../common/src/service/encryption/encryption-service'

const reportBucketName = Config.get('REPORT_BUCKET_NAME')
const pdfUploadEncryptionKey = Config.get('PDF_UPLOAD_ENCRYPTION_KEY')
const testResultBucketName = Config.get('TEST_RESULTS_BUCKET_NAME')

export default class {
  private reportBucketService = new BucketService(reportBucketName)
  private testResultBucketService = new BucketService(testResultBucketName)
  private identifiersModel = new IdentifiersModel(new DataStore())

  async uploadReport(stream: Stream): Promise<string> {
    const identifier = await this.identifiersModel.getUniqueValue('report')
    const fileName = `report-${identifier}.pdf`
    LogInfo('uploadReport', 'ReportUpload', {fileName, reportBucketName})
    return this.reportBucketService.uploadFile(fileName, stream)
  }

  generateFileName(testResultId: string): string {
    const key = testResultId.concat(String(Date.now()))
    const encryptionService = new EncryptionService(pdfUploadEncryptionKey)
    return `${encryptionService.encrypt(key)}.pdf`
  }

  async uploadPDFResult(stream: Stream, fileName: string): Promise<void> {
    LogInfo('uploadPDFResult', 'PDFResultUpload', {fileName, testResultBucketName})
    this.testResultBucketService.uploadFile(fileName, stream)
  }

  async getSignedInUrl(fileName: string): Promise<string> {
    return this.testResultBucketService.generateV4ReadSignedUrl(fileName)
  }
}
