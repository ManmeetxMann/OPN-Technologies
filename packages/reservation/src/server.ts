import {app} from './app'
import {Config} from '../../common/src/utils/config'
import {join} from 'path'
import {createConnection} from 'typeorm'
import {isGAEService} from '../../common/src/utils/app-engine-environment'

/**
 * TODO:
 * 1. Move it to wrapper similar to express
 */
let connection = {}
if (isGAEService()) {
  // Connect via socket when deployed to GCP
  connection = {
    host: Config.get('DB_SQL_HOST'),
    extra: {
      socketPath: Config.get('DB_SQL_HOST'),
    },
  }
} else {
  // Connect via TCP when on local with local DB or Cloud SQL with proxy
  connection = {
    host: Config.get('DB_SQL_LOCAL_HOST'),
    port: Number(Config.get('DB_SQL_LOCAL_PORT')),
  }
}

createConnection({
  ...connection,
  type: 'mysql',
  database: Config.get('DB_SQL_NAME'),
  username: Config.get('DB_SQL_USERNAME'),
  password: Config.get('DB_SQL_PASSWORD'),
  entities: [join(__dirname, '../../../services-v2/apps/user-service/src/model/**/*.ts')],
  synchronize: true,
  logging: false,
})
  .then(() => {
    console.log('DB connection established')
    app.listen()
  })
  .catch((error) => {
    console.error('No connection to SQL database')
    console.error(error)
  })

export const init = (): void => app.initialize()
