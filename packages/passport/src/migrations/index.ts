import {AttestationsEdit} from './attestationsEdit'
const attestationMigration = new AttestationsEdit()
const [method] = process.argv.slice(2)

function runMigration(): void {
  attestationMigration[method]()
    .then(() => {
      console.log('migrations completed successfully')
    })
    .catch((e) => {
      console.error(`migrations error: ${e.message}`)
    })
}

runMigration()
