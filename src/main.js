const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const helpers = require('./helpers')
const client = require('./client')

const MIGRATIONS_TABLE_NAME = 'caravel_migrations'
const DEFAULT_MIGRATIONS_FOLDER_NAME = 'migrations'

const { MIGRATIONS_FOLDER_NAME } = process.env
const MIGRATIONS_FOLDER = MIGRATIONS_FOLDER_NAME || DEFAULT_MIGRATIONS_FOLDER_NAME

let globalClient

const createMigrationsTable = tableName => {
  return globalClient.query(
    `CREATE TABLE ${tableName} (version integer PRIMARY KEY)`
  )
}

const checkIfMigrationTableExists = async () => {
  const response = await globalClient.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_name = '${MIGRATIONS_TABLE_NAME}'
    )`
  )
  const { exists } = response.rows[0]

  if (!exists) {
    console.log('🔧 No migration table found, creating...')
    await createMigrationsTable(MIGRATIONS_TABLE_NAME)
    console.log('👌 Migrations table created')
  } else {
    console.log('👌 Migration table exists')
  }
}

const readMigrationFileContent = async oneFileName => {
  const [ versionNumber ] = oneFileName.split('-')
  const pathName = path.resolve(MIGRATIONS_FOLDER, oneFileName)
  const fileContent = await helpers.readFile(pathName, "utf8")
  return {
    version: parseInt(versionNumber),
    sql: fileContent,
  }
}

const getAllMigrationsFromFolder = async (migrationsFolder) => {
  console.log('📄 Getting all migrations from folder...')
  const migrationFolder = await helpers.readdir(path.resolve(migrationsFolder || MIGRATIONS_FOLDER))
  const migrationFiles = migrationFolder.map(readMigrationFileContent)
  return Promise.all(migrationFiles)
}

const getAllMigrationsFromTable = async () => {
  console.log('📈 Getting all migrations in table...')
  const response = await globalClient.query(`SELECT * FROM ${MIGRATIONS_TABLE_NAME}`)
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
    `INSERT INTO ${MIGRATIONS_TABLE_NAME} (version) VALUES ($1)`,
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

const createClientAndConnect = async (configFilePath) => {
  const pgClient = client.create(configFilePath)
  globalClient = pgClient
  return await client.connect(globalClient)
}

const printError = error => {
  console.error(chalk.bold.red('error: An error occured during migrate.'))
  console.error(chalk.bold.yellow(`  ${error}`))
  console.error()
  console.error(chalk.bold.green('information: Some informations to help you debug.'))
  console.error(chalk.bold.green(`  DATABASE_URL: ${globalClient.databaseURL()}`))
}

const runMigrations = async (configFilePath, migrationsFolder) => {
  try {
    const connected = await createClientAndConnect(configFilePath)
    if (connected) {
      await checkIfMigrationTableExists()
      const migrationsRowsFromDB = await getAllMigrationsFromTable()
      const migrationsFromFS = await getAllMigrationsFromFolder(migrationsFolder)
      const migrationsToExecute = await compareMigrations(
        migrationsRowsFromDB,
        migrationsFromFS,
      )
      await stageMigrations(migrationsToExecute)
    } else {
      console.error([
        'Unable to connect to your database.',
        'Are you sure it is up and running?',
        `You’re trying to connect to ${client.readDatabaseURL(globalClient)}`
      ].join(' '))
    }
  } catch (error) {
    printError(error)
  } finally {
    if (globalClient) {
      await globalClient.end()
    }
  }
}

const generateUpAndDownFileNames = (timestamp, name) => {
  const baseName = `${timestamp}-${name}`
  const upAndDownNames = [
    `${baseName}.up`,
    `${baseName}.down`,
  ]
  const fullNames = upAndDownNames.map(elem => `${elem}.sql`)
  return fullNames
}

const writeMigrationFile = filename => {
  console.log(chalk.bold.green(`Creating ${filename}...`))
  return helpers.writeFile(filename, '-- Your migration code here.')
}

const turnIntoAbsolutePath = migrationsPath => filename => {
  return path.resolve(migrationsPath, filename)
}

const generateMigrationHelp = async (migrationsFolder, name) => {
  const migrationsPath = path.resolve(migrationsFolder || MIGRATIONS_FOLDER)
  try {
    await helpers.access(migrationsPath, fs.constants.F_OK | fs.constants.W_OK)
    const timestamp = Date.now()
    const upAndDownFileNames = generateUpAndDownFileNames(timestamp, name)
    const fullUpAndDownFileNames = upAndDownFileNames.map(turnIntoAbsolutePath(migrationsPath))
    const results = fullUpAndDownFileNames.map(writeMigrationFile)
    await Promise.all(results)
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log(chalk.bold.green('No corresponding migration folder. Creating...'))
      await helpers.mkdir(migrationsPath)
      generateMigration(migrationsPath, name)
    } else {
      console.error(error)
    }
  }
}

const generateMigration = async (migrationsFolder, name) => {
  if (name.length === 0) {
    console.error(chalk.bold.red('You did not specified migration name. Aborting.'))
  } else {
    await generateMigrationHelp(migrationsFolder, name)
  }
}

module.exports = {
  runMigrations,
  generateMigration,
}
