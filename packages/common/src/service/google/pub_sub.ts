import {PubSub, Topic} from '@google-cloud/pubsub'

export class OPNPubSub {
  private pubSubClient = new PubSub()
  private topic:Topic

  constructor(topicName: string) {
    this.topic = this.pubSubClient.topic(topicName)
  }

  async publish(data: unknown): Promise<void> {
    this.topic.publish(
      Buffer.from(
        JSON.stringify(data),
      ),
    )
  }
}
