import {AttestationsEdit} from './attestationsEdit'

function runMigration(): void {
  const attestationMigration = new AttestationsEdit()
  const [method] = process.argv.slice(2)

  attestationMigration[method]()
    .then(() => {
      console.log('migrations completed successfully')
    })
    .catch((e) => {
      console.error(`migrations error: ${e.message}`)
    })
}

runMigration()
