import {CloudTasksClient} from '@google-cloud/tasks'
import {Config} from '../../utils/config'

export class OPNCloudTasks {
  private taskClient = new CloudTasksClient()
  private path: string
  constructor(queueName: string) {
    this.path = this.taskClient.queuePath(
      Config.get('GAE_PROJECT_NAME'),
      Config.get('GAE_LOCATION'),
      queueName,
    )
  }

  async createTask(data: unknown, request_path: string): Promise<void> {
    const task = {
      appEngineHttpRequest: {
        httpMethod: 'POST',
        relativeUri: request_path,
        body: Buffer.from(JSON.stringify(data)).toString('base64'),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }
    const request = {
      parent: this.path,
      task,
    }
    // @ts-ignore POST has type string
    await this.taskClient.createTask(request)
  }
}
