const path = require('path')
const helpers = require('./helpers')
const client = require('./client')

const MIGRATION_TABLE_NAME = 'caravel_migrations'
const DEFAULT_MIGRATION_FOLDER_NAME = 'migrations'

const { MIGRATION_FOLDER_NAME } = process.env
const MIGRATION_FOLDER = MIGRATION_FOLDER_NAME || DEFAULT_MIGRATION_FOLDER_NAME

let globalClient

const checkIfMigrationTableExists = async () => {
  const response = await globalClient.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = ${MIGRATION_TABLE_NAME}
    )`
  )
  const { exists } = response.rows[0]

  if (!exists) {
    console.log('🔧 No migration table found, creating...')
    await globalClient.query(
      `CREATE TABLE ${MIGRATION_TABLE_NAME} (version integer PRIMARY KEY)`
    )
    console.log('👌 Migrations table created')
  } else {
    console.log('👌 Migration table exists')
  }
}

const readMigrationFileContent = async oneFileName => {
  const [ versionNumber ] = oneFileName.split('-')
  const pathName = path.resolve(MIGRATION_FOLDER, oneFileName)
  const fileContent = await helpers.readFile(pathName, "utf8")
  return {
    version: parseInt(versionNumber),
    sql: fileContent,
  }
}

const getAllMigrationsFromFolder = async () => {
  console.log('📄 Getting all migrations from folder...')
  const migrationFolder = await helpers.readdir(path.resolve(MIGRATION_FOLDER))
  const migrationFiles = migrationFolder.map(readMigrationFileContent)
  return Promise.all(migrationFiles)
}

const getAllMigrationsFromTable = async () => {
  console.log('📈 Getting all migrations in table...')
  const response = await globalClient.query(`SELECT * FROM ${MIGRATION_TABLE_NAME}`)
  return response.rows
}

const compareMigrations = async (migrationsRowsFromDB, migrationsFromFS) => {
  const tableVersions = migrationsRowsFromDB.map(oneRow => oneRow.version)
  const migrationsToExecute = migrationsFromFS.filter(oneMigration =>
    !tableVersions.includes(oneMigration.version)
  )
  return migrationsToExecute
}

const updateMigrationTable = (newVersion) => {
  return globalClient.query(
    `INSERT INTO ${MIGRATION_TABLE_NAME} (version) VALUES($1)`,
    [ newVersion ]
  )
}

const stageMigrations = async (migrationsToExecute) => {
  if (migrationsToExecute.length === 0) {
    console.log('🙌 Database is up to date!')
    console.log('🤝 Migrations finished successfully !')
    return true
  } else {
    const [ currentMigration, ...nextMigrations ] = migrationsToExecute
    try {
      await executeMigrations(currentMigration)
      return await stageMigrations(nextMigrations)
    } catch (error) {
      console.error(
        '🚫 ERROR with migration, version: ',
        currentMigration.version,
      )
      console.error(error)
      return false
    }
  }
}

const executeMigrations = async (migration) => {
  await globalClient.query(migration.sql)
  console.log('🚀 SUCCESS with migration, version: ', migration.version)
  await updateMigrationTable(migration.version)
}

const runMigrations = async (configFilePath) => {
  try {
    const pgClient = await client.create(configFilePath)
    globalClient = pgClient
    const connected = await client.connect(globalClient)
    if (connected) {
      await checkIfMigrationTableExists()
      const migrationsRowsFromDB = await getAllMigrationsFromTable()
      const migrationsFromFS = await getAllMigrationsFromFolder()
      const migrationsToExecute = await compareMigrations(
        migrationsRowsFromDB,
        migrationsFromFS,
      )
      await stageMigrations(migrationsToExecute)
    } else {
      console.error([
        'Unable to connect to your database.',
        'Are you sure it is up and running?',
      ].join(' '))
    }
  } catch (error) {
    console.error('An error occured during migrate.')
    console.error()
    console.error(`  ${error}`)
  } finally {
    if (globalClient) {
      await globalClient.end()
    }
  }
}

module.exports = {
  runMigrations,
}
