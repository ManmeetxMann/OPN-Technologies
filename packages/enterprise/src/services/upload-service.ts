import BucketService from '../../../common/src/service/google/bucket'
import {Config} from '../../../common/src/utils/config'
import {IdentifiersModel} from '../../../common/src/data/identifiers'
import DataStore from '../../../common/src/data/datastore'

import {Stream} from 'stream'

const bucketName = Config.get('REPORT_BUCKET_NAME')

export default class {
  private bucketService = new BucketService(bucketName)
  private identifiersModel = new IdentifiersModel(new DataStore())
  async uploadReport(stream: Stream): Promise<string> {
    const identifier = await this.identifiersModel.getUniqueValue('report')
    return this.bucketService.uploadFile(`report-${identifier}.pdf`, stream)
  }
}
