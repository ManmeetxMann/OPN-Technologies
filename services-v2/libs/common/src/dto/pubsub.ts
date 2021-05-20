import {ApiProperty, ApiPropertyOptional} from '@nestjs/swagger'
import {IsDefined, IsOptional, IsString} from 'class-validator'

/**
 * PubSub message validation model with generic attributes
 */
export class PubSubMessage<T> {
  @ApiProperty()
  @IsString()
  data: string

  @IsDefined()
  attributes: T

  @IsOptional()
  messageId: string

  @IsOptional()
  message_id: string

  @IsOptional()
  publishTime: string

  @IsOptional()
  publish_time: string
}

/**
 * PubSub payload validation model with generic message
 */
export class PubSubPayload<T> {
  @IsDefined()
  message: T

  @ApiPropertyOptional()
  @IsOptional()
  subscription: string
}
