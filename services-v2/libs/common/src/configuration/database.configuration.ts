import {TypeOrmModule} from '@nestjs/typeorm'
import {DynamicModule} from '@nestjs/common'
// eslint-disable-next-line no-restricted-imports
import {ConfigModule} from '@nestjs/config'
import {OpnConfigService} from '@opn-services/common/services'
import {isRunningOnGCP} from '@opn-services/common/utils'

export const DefaultDatabaseConfiguration = (): DynamicModule => {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [OpnConfigService],
    useFactory: (configService: OpnConfigService) => {
      let connection = {}
      if (isRunningOnGCP()) {
        // Connect via socket when deployed to GCP
        connection = {
          host: configService.get<string>('DB_SQL_HOST'),
          extra: {
            socketPath: configService.get<string>('DB_SQL_HOST'),
          },
        }
      } else {
        // Connect via TCP when on local with local DB or Cloud SQL with proxy
        connection = {
          host: configService.get<string>('DB_SQL_LOCAL_HOST'),
          port: configService.get<number>('DB_SQL_LOCAL_PORT'),
        }
      }
      console.log(connection)
      return {
        ...connection,
        type: 'mysql',
        database: configService.get<string>('DB_SQL_NAME'),
        username: configService.get<string>('DB_SQL_USERNAME'),
        password: configService.get<string>('DB_SQL_PASSWORD'),
        synchronize: false,
        migrationsRun: false,
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
