import {DocumentBuilder} from '@nestjs/swagger'

export const SwaggerConfiguration = new DocumentBuilder()
  .setTitle('OPN - services')
  .setVersion('0.2')
  .addBearerAuth()
  .build()
