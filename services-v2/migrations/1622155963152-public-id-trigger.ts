import {MigrationInterface, QueryRunner, getManager} from 'typeorm'

export class publicIdTrigger1622155963152 implements MigrationInterface {
  public async up(): Promise<void> {
    try {
      console.log(`Migration Starting Time: ${new Date()}`)
      const query =
        `
DROP TRIGGER IF EXISTS \`opn\`.\`patient_BEFORE_INSERT\`;

DELIMITER $$
USE \`opn\`$$
CREATE DEFINER=\`root\`@\`localhost\` TRIGGER \`opn\`.\`patient_BEFORE_INSERT\` BEFORE INSERT ON \`patient\` FOR EACH ROW
BEGIN
\tdeclare fk_parent_user_id int default 0;

\t  select auto_increment into fk_parent_user_id
\t\tfrom information_schema.tables
\t   where table_name = 'patient'
\t\t and table_schema = database();

\tIF NEW.publicId IS NULL THEN
\t\tSET NEW.publicId = fk_parent_user_id+10;
\tEND IF;
END$$
DELIMITER ;
      `.replace('\n', ' ')

      console.log({ query })
      const manager = getManager()
      const rawData = await manager.query(query)
      console.log(`Successfully inserted ${rawData}`)
    } catch (error) {
      console.error('Error running migration', error)
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    const manager = getManager()
    await manager.query(`DROP TRIGGER IF EXISTS \`opn\`.\`patient_BEFORE_INSERT\`;`)
  }
}
