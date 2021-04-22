import {TypeOrmModule} from '@nestjs/typeorm'
import {DynamicModule} from '@nestjs/common'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {isRunningOnGCP} from '@opn-services/common/utils'

export const DefaultDatabaseConfiguration = (service: string): DynamicModule => {
  const env = (property: string) => [service, 'DB', property].join('_').toUpperCase()

  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => {
      let connection = {}
      if (isRunningOnGCP()) {
        // Connect via socket when deployed to GCP
        connection = {
          host: configService.get<string>(env('DB_SQL_HOST')),
          extra: {
            socketPath: configService.get<string>(env('DB_SQL_HOST')),
          },
        }
      } else {
        // Connect via TCP when on local with local DB or Cloud SQL with proxy
        connection = {
          host: configService.get<string>(env('DB_SQL_LOCAL_HOST')),
          port: configService.get<number>(env('DB_SQL_LOCAL_PORT')),
        }
      }

      return {
        ...connection,
        type: 'mysql',
        database: configService.get<string>(env('DB_SQL_NAME')),
        username: configService.get<string>(env('DB_SQL_USERNAME')),
        password: configService.get<string>(env('DB_SQL_PASSWORD')),
        synchronize: configService.get<boolean>(env('DB_SQL_AUTO_SYNC_SCHEMA')),
        migrationsRun: configService.get<boolean>(env('DB_SQL_RUN_MIGRATION')),
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
