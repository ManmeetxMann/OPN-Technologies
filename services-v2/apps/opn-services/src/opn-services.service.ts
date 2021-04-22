import {Injectable} from '@nestjs/common'

@Injectable()
export class OpnServicesService {
  getHello(): string {
    return 'Hello World!'
  }
}
