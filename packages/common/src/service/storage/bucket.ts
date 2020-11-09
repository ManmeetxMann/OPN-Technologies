import {Storage, CreateBucketRequest, Bucket} from '@google-cloud/storage'

import {ResourceNotFoundException} from '../../exceptions/resource-not-found-exception'
import {Stream} from 'stream'

export default class {
  private client: Storage = new Storage()
  private bucketName: string
  private bucket: Bucket

  constructor(bucketName: string) {
    this.bucketName = bucketName
    this.initializeBucket()
  }

  private async createBucket(options?: CreateBucketRequest): Promise<Bucket> {
    // [bucket, metadata]
    const [bucket] = await this.client.createBucket(this.bucketName, options)
    return bucket
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
      console.log('resolved')
      return (
        file
          .makePublic()
          // TODO: the file.publicUrl function does not work as expected
          .then(() => `${this.client.apiEndpoint}/${this.bucket.name}/${file.name}`)
      )
    })
  }
}
