import {TypeOrmModule} from '@nestjs/typeorm'
import {ConfigModule, ConfigService} from '@nestjs/config'

export const DefaultDatabaseConfiguration = (service: string) => {
  const env = (property: string) => [service, 'DB', property].join('_').toUpperCase()

  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      const isGAE = Boolean(configService.get('GOOGLE_CLOUD_PROJECT'))
      let connection = {}

      if (isGAE) {
        // Connect via socket when deployed to GCP
        connection = {
          host: configService.get<string>(env('HOST')),
          extra: {
            socketPath: configService.get<string>(env('HOST')),
          },
        }
      } else {
        // Connect via TCP when on local with local DB or cloud proxy
        connection = {
          host: configService.get<string>(env('LOCAL_HOST')),
          port: configService.get<number>(env('LOCAL_PORT')),
        }
      }

      return {
        ...connection,
        type: 'mysql',
        database: configService.get(env('NAME')),
        username: configService.get<string>(env('USERNAME')),
        password: configService.get<string>(env('PASSWORD')),
        synchronize: configService.get<boolean>(env('AUTO_SYNC_SCHEMA')),
        migrationsRun: configService.get<boolean>(env('RUN_MIGRATION')),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        logging: ['warn', 'error', 'query'],
        autoLoadEntities: true,
        retryAttempts: 1,
        retryDelay: 3000,
        keepConnectionAlive: false,
      }
    },
  })
}
