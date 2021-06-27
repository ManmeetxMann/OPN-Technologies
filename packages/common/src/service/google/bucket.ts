import {Storage, Bucket} from '@google-cloud/storage'

import {ResourceNotFoundException} from '../../exceptions/resource-not-found-exception'
import {Stream} from 'stream'
import {Actions, FiveDay, Versions} from '../../types/bucket'

export default class {
  private client: Storage = new Storage()
  private bucketName: string
  private bucket: Bucket

  constructor(bucketName: string) {
    this.bucketName = bucketName
    this.initializeBucket()
  }

  async generateV4ReadSignedUrl(fileName: string): Promise<string> {
    const options = {
      version: Versions.v4,
      action: Actions.read,
      expires: FiveDay,
    }

    // Get a v4 signed URL for reading the file
    const [url] = await this.client.bucket(this.bucketName).file(fileName).getSignedUrl(options)
    return url
  }

  private async getBucket(): Promise<Bucket> {
    const bucket = await this.client.bucket(this.bucketName)
    if (!bucket) {
      throw new ResourceNotFoundException(`Bucket with name ${this.bucketName} not found`)
    }
    return bucket
  }

  private async initializeBucket() {
    // TODO: may want to try to create the bucket if this get fails
    const bucket = await this.getBucket()
    this.bucket = bucket
  }

  async uploadFile(fileName: string, stream: Stream): Promise<string> {
    const file = this.bucket.file(fileName)
    const writeStream = file.createWriteStream()
    return new Promise((resolve, reject) => {
      stream
        .pipe(writeStream)
        .on('close', resolve)
        .on('finish', resolve)
        .on('end', resolve)
        .on('error', reject)
    }).then(() => {
      return (
        file
          .makePublic()
          // TODO: the file.publicUrl function does not work as expected
          .then(() => `${this.client.apiEndpoint}/${this.bucket.name}/${file.name}`)
      )
    })
  }
}
