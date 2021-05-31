import {MigrationInterface, QueryRunner, getManager, getRepository} from 'typeorm'
import {Patient} from '../apps/user-service/src/model/patient/patient.entity'
const publicPatientIdPrefix = process.env.PATIENT_ID_PREFIX || 'FH'

async function updateOldPatients() {
  const patientsCount = await getPatientsCount()
  for (let offset = 0; offset < patientsCount; offset += limit) {
    const currentPatients = await getPatient(offset)
    await Promise.all(currentPatients.map(({idPatient}) => updatePatient(idPatient)))
  }
}

export class publicIdTrigger1622155963152 implements MigrationInterface {
  public async up(): Promise<void> {
    try {
      console.log(`Migration Starting Time: ${new Date()}`)
      await updateOldPatients()
      const query = `CREATE DEFINER = CURRENT_USER TRIGGER \`${process.env.DB_SQL_NAME}\`.\`patient_BEFORE_INSERT\` BEFORE INSERT ON \`patient\` FOR EACH ROW SET NEW.publicId = CONCAT('${publicPatientIdPrefix}',
    LPAD((SELECT auto_increment FROM information_schema.tables WHERE table_name = 'patient' AND table_schema = DATABASE())+10,6,0));`
      const manager = getManager()
      await manager.query(query)
      console.log(`Successfully created`)
    } catch (error) {
      console.error('Error running migration', error)
      throw error
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    const manager = getManager()
    await manager.query(`DROP TRIGGER IF EXISTS \`opn\`.\`patient_BEFORE_INSERT\`;`)
  }
}

async function getPatientsCount() {
  try {
    return await getRepository(Patient)
      .createQueryBuilder('patient')
      .getCount()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function getPatient(offset) {
  try {
    return await getRepository(Patient)
      .createQueryBuilder('patient')
      .offset(offset)
      .limit(limit)
      .getMany()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

async function updatePatient(idPatient: number) {
  try {
    return await getRepository(Patient)
      .createQueryBuilder('patient')
      .update()
      .set({publicId: `${publicPatientIdPrefix}${String(idPatient + 10).padStart(6, '0')}`})
      .where('idPatient = :idPatient', {idPatient})
      .execute()
  } catch (error) {
    console.warn(error)
    throw error
  }
}

const limit = 10
