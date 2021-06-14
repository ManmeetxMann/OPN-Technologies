module.exports = {
  port: 3306,
  host: '127.0.0.1',
  type: 'mysql',

  // Local
  // database: 'opn_services',
  // username: 'opn_services_user',
  // password: 'JA?=b2EfMhd.684g',

  // Pre prod
  database: 'opn_services',
  username: 'opn_services_user',
  password: 'JA?=b2EfMhd.684g',

  synchronize: false,
  synchronize: false,
  entities: ['../**/*.entity.ts'],
  logging: ['warn', 'error', 'query'],
  migrations: ['./**/*.ts'],
  cli: {
    migrationsDir: '../dist/src/migration',
  },
  autoLoadEntities: true,
  retryAttempts: 1,
  retryDelay: 3000,
  keepConnectionAlive: false,
}
