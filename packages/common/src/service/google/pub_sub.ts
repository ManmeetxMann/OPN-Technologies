import {PubSub, Topic} from '@google-cloud/pubsub'
import {LogInfo} from '../../utils/logging-setup'

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
    this.topic.publish(Buffer.from(JSON.stringify(data)), this.stripNonStringAttributes(attributes))
  }

  private stripNonStringAttributes(attributes: Record<string, unknown>): Record<string, string> {
    const keys = Object.keys(attributes)
    const result: Record<string, string> = {}
    keys.forEach((key: string) => {
      const value = attributes[key]
      if (typeof value !== 'string') {
        LogInfo(`${this.topicName}PubSub`, 'RemovedAttribute', {key, value})
      } else {
        result[key] === value
      }
    })
    return result
  }

  static async getPublishedData(data: string): Promise<unknown> {
    return JSON.parse(Buffer.from(data, 'base64').toString())
  }
}
