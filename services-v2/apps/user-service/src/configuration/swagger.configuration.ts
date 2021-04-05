import {DocumentBuilder} from '@nestjs/swagger'

export const SwaggerConfiguration = new DocumentBuilder()
  .setTitle('OPN - user-service')
  .setVersion('1.0')
  .setBasePath('/api/v')
  .addTag('cats')
  .build()
