const createMigrationsTable = (client, tableName) => {
  return client.query(
    `CREATE TABLE ${tableName} (version text PRIMARY KEY)`
  )
}

const checkIfMigrationTableExists = async (client, tableName) => {
  const response = await client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = '${tableName}'
    )`
  )
  const { exists } = response.rows[0]
  if (!exists) {
    console.log('🔧 No migration table found, creating...')
    await createMigrationsTable(client, tableName)
    console.log('👌 Migrations table created')
  } else {
    console.log('👌 Migration table exists')
  }
}

const getAllMigrationsFromTable = async (client, tableName) => {
  console.log('📈 Getting all migrations in table...')
  const response = await client.query(`SELECT * FROM ${tableName} ORDER BY version`)
  return response.rows
}

module.exports = {
  checkIfMigrationTableExists,
  getAllMigrationsFromTable,
}
