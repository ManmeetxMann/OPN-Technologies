import {PubSub, Topic} from '@google-cloud/pubsub'
import {LogInfo} from '../../utils/logging-setup'
import {BadRequestException} from '../../exceptions/bad-request-exception'
//TODO: Add Encryption or security layer
export class OPNPubSub {
  private pubSubClient = new PubSub()
  private topicName: string
  private topic: Topic

  constructor(topicName: string) {
    this.topicName = topicName
    this.topic = this.pubSubClient.topic(topicName)
  }

  async publish(data: unknown, attributes: Record<string, string> = {}): Promise<void> {
    LogInfo('publish', 'PubSubPublishTopicData', {
      topicName: this.topicName,
      data,
      attributes,
    })

    this.checkAttributes(attributes)
    this.topic.publish(Buffer.from(JSON.stringify(data)), attributes)
  }

  private checkAttributes(attributes: Record<string, unknown>) {
    const keys = Object.keys(attributes)
    keys.forEach((key: string) => {
      const value = attributes[key]
      if (typeof value !== 'string') {
        throw new BadRequestException(`{${key}: ${JSON.stringify(value)}} is not a valid attribute`)
      }
    })
  }

  static async getPublishedData(data: string): Promise<unknown> {
    return JSON.parse(Buffer.from(data, 'base64').toString())
  }
}
