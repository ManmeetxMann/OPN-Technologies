import {TypeOrmModule} from '@nestjs/typeorm'
import {ConfigModule, ConfigService} from '@nestjs/config'

export const DefaultDatabaseConfiguration = (service: string) => {
  const env = (property: string) => [service, 'DB', property].join('_').toUpperCase()
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (configService: ConfigService) => ({
      type: 'mysql',
      host: configService.get<string>(env('HOST')),
      port: +configService.get<number>(env('PORT')),
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
    }),
  })
}
