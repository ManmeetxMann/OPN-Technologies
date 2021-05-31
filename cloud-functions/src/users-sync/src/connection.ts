// import {join} from 'path'
import * as functions from 'firebase-functions'
import {getConnection, createConnection, ConnectionOptions, Connection} from 'typeorm'
import * as patientEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient.entity'
import * as patientProfileEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient-profile.entity'
import * as patientRelationEntries from '../../../../services-v2/apps/user-service/src/model/patient/patient-relations.entity'

/**
 * Checks if connection pool exist,
 * if not creates one and returns connection
 * @returns
 */
const getCreateDatabaseConnection = async (): Promise<Connection> => {
  let connection = null

  // Return connection is exist
  try {
    connection = getConnection()
  } catch (error) {
    functions.logger.log('No existing DB connection')
  }

  if (connection && connection.isConnected) {
    functions.logger.log('Using existing DB connection')
    return connection
  }

  if (connection && !connection.isConnected) {
    functions.logger.warn('Existing DB connection not connected')
  }

  // Create new connection
  try {
    let connectionConfig = {}
    if (isCloudFunction()) {
      // Connect via socket when deployed to GCP
      connectionConfig = {
        host: process.env.DB_SQL_HOST,
        extra: {
          socketPath: process.env.DB_SQL_HOST,
          connectionLimit: 1,
        },
      }
    } else {
      // Connect via TCP when on local with local DB or Cloud SQL with proxy
      connectionConfig = {
        host: process.env.DB_SQL_LOCAL_HOST,
        port: process.env.DB_SQL_LOCAL_PORT,
      }
    }

    const config = {
      ...connectionConfig,
      type: 'mysql',
      database: process.env.DB_SQL_NAME,
      username: process.env.DB_SQL_USERNAME,
      password: process.env.DB_SQL_PASSWORD,
      entities: [
        patientEntries.Patient,
        patientEntries.PatientAuth,
        patientEntries.PatientAddresses,
        patientEntries.PatientAdmin,
        patientProfileEntries.PatientDigitalConsent,
        patientProfileEntries.PatientHealth,
        patientProfileEntries.PatientTravel,
        patientRelationEntries.PatientToDelegates,
        patientRelationEntries.PatientToOrganization,
      ],
      synchronize: false,
      logging: false,
    } as ConnectionOptions
    connection = await createConnection(config)

    functions.logger.log('DB connection established')
  } catch (error) {
    functions.logger.error('No connection to SQL database')
    functions.logger.error(error)
  }

  return connection
}

/**
 * Checks variables auto set by cloud function
 */
const isCloudFunction = () => {
  const isEnvSet = (envKey) => typeof process.env[envKey] === 'string'
  return isEnvSet('FUNCTION_TARGET') && isEnvSet('FUNCTION_SIGNATURE_TYPE')
}

export {getCreateDatabaseConnection}
