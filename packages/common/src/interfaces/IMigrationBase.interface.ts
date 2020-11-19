interface IMigrationBase {
  up(): Promise<void>
  down(): Promise<void>
}

export default IMigrationBase
