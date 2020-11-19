import {AttestationsEdit} from './attestationsEdit'

class Migrations {
  public attestationMigration = new AttestationsEdit()
  constructor() {
    const [method] = process.argv.slice(2);

    this.attestationMigration[method]()
      .then(() => {
          console.log('migrations completed successfully')
      })
      .catch(e => {
          console.error(`migrations error: ${e.message}`)
      });
  }
}

new Migrations();
