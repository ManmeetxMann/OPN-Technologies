import {DocumentBuilder} from '@nestjs/swagger'

export const SwaggerConfiguration = new DocumentBuilder()
  .setTitle('OPN - services')
  .setVersion('0.1')
  .setBasePath('/api/v1')
  .addBearerAuth({type: 'http', scheme: 'bearer', bearerFormat: 'JWT'}, 'JWT')
  .build()
