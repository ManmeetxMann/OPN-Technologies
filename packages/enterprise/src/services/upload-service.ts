import BucketService from '../../../common/src/service/storage/bucket'
import {Config} from '../../../common/src/utils/config'
import {Stream} from 'stream'

const bucketName = Config.get('REPORT_BUCKET_NAME')

export default class {
  private bucketService = new BucketService(bucketName)

  async uploadReport(filename: string, stream: Stream): Promise<string> {
    return this.bucketService.uploadFile(filename, stream)
  }
}
