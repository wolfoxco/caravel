const path = require('path')
const chalk = require('chalk')
const helpers = require('./helpers')
const client = require('./client')
const queries = require('./queries')
const { MIGRATIONS_TABLE_NAME, MIGRATIONS_FOLDER } = require('./constants')

let globalClient

const readMigrationFileContent = async oneFileName => {
  const [ versionNumber ] = oneFileName.split('-')
  const pathName = path.resolve(MIGRATIONS_FOLDER, oneFileName)
  const fileContent = await helpers.readFile(pathName, "utf8")
  return {
    version: versionNumber,
    filename: oneFileName,
    sql: fileContent,
  }
}

const upOrDownFilter = upOrDown => filename => {
  const parts = filename.split('.').reverse()
  return (
    parts.length >= 3
    && parts[0] === 'sql'
    && parts[1] === upOrDown
  )
}

const getAllMigrationsFromFolder = async (migrationsFolder) => {
  console.log('📄 Getting all migrations from folder...')
  const migrationsFileNames = await helpers.readdir(path.resolve(migrationsFolder || MIGRATIONS_FOLDER))
  const filteredUpMigrationsFileNames = migrationsFileNames.filter(upOrDownFilter('up'))
  const filteredDownMigrationsFileNames = migrationsFileNames.filter(upOrDownFilter('down'))
  const upMigrationsFiles = Promise.all(filteredUpMigrationsFileNames.map(readMigrationFileContent))
  const downMigrationsFiles = Promise.all(filteredDownMigrationsFileNames.map(readMigrationFileContent))
  return Promise.all([ upMigrationsFiles, downMigrationsFiles ])
}

const compareMigrations = async (migrationsRowsFromDB, migrationsFromFS) => {
  const tableVersions = migrationsRowsFromDB.map(oneRow => oneRow.version)
  const migrationsToExecute = migrationsFromFS.filter(oneMigration =>
    !tableVersions.includes(oneMigration.version)
  )
  return migrationsToExecute
}

const executeMigration = async ({ sql, version, filename }) => {
  await globalClient.query('BEGIN')
  await globalClient.query(sql)
  await globalClient.query(
    `INSERT INTO ${MIGRATIONS_TABLE_NAME} (version) VALUES ($1)`,
    [ version ]
  )
  await globalClient.query('END')
  console.log(`🚀 SUCCESS with migration ${filename}`)
}

const revertMigration = async (migration, lastMigration) => {
  if (migration) {
    const { sql, version } = migration
    await globalClient.query('BEGIN')
    await globalClient.query(sql)
    await globalClient.query(
      `DELETE FROM ${MIGRATIONS_TABLE_NAME} WHERE version = $1`,
      [ version ]
    )
    await globalClient.query('END')
  } else {
    throw new Error(`Migration ${lastMigration.version} do not have a down file.`)
  }
}

const stageMigrations = async (migrationsToExecute) => {
  if (migrationsToExecute.length === 0) {
    console.log('🙌 Database is up to date!')
    console.log('🤝 Migrations finished successfully !')
    return true
  } else {
    const [ currentMigration, ...nextMigrations ] = migrationsToExecute
    try {
      await executeMigration(currentMigration)
      return await stageMigrations(nextMigrations)
    } catch (error) {
      console.error(`🚫 ERROR with migration ${currentMigration.filename}`)
      console.error(error)
      return false
    }
  }
}

const createClientAndConnect = async (configFilePath) => {
  const pgClient = client.create(configFilePath)
  globalClient = pgClient
  return await client.connect(globalClient)
}

const printError = error => {
  console.error(chalk.bold.red('error: An error occured during execution.'))
  console.error(chalk.bold.yellow(`  ${error}`))
  console.error()
  console.error(chalk.bold.green('information: Some informations to help you debug.'))
  console.error(chalk.bold.green(`  DATABASE_URL: ${globalClient.databaseURL()}`))
}

const revertOneByOne = async (numberToInvert, migrationsRows, downMigrationsFromFS) => {
  if (numberToInvert <= 0 || migrationsRows.length === 0) {
    console.log('Reverting migrations done.')
    console.log('Reverting finished successfully.')
  } else {
    const lastMigration = migrationsRows[0]
    const migration = downMigrationsFromFS.find(migration => {
      return migration.version === lastMigration.version
    })
    await revertMigration(migration, lastMigration)
    console.log(`Success reverting the ${migration.filename} migration.`)
    return revertOneByOne(
      numberToInvert - 1,
      migrationsRows.splice(1),
      downMigrationsFromFS
    )
  }
}

const connectAndSetupEnvironment = async (configFilePath, migrationsFolder, apply) => {
  try {
    const connected = await createClientAndConnect(configFilePath)
    if (connected) {
      await queries.checkIfMigrationTableExists(globalClient, MIGRATIONS_TABLE_NAME)
      const migrationsRowsFromDB = await queries.getAllMigrationsFromTable(globalClient, MIGRATIONS_TABLE_NAME)
      const migrationsFromFS = await getAllMigrationsFromFolder(migrationsFolder)
      await apply(migrationsRowsFromDB, migrationsFromFS)
    } else {
      console.error([
        'Unable to connect to your database.',
        'Are you sure it is up and running?',
        `You’re trying to connect to ${globalClient.databaseURL()}`
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

const run = (configFilePath, migrationsFolder) => {
  const applier = async (migrationsRowsFromDB, upAndDownMigrationsFromFS) => {
    const migrationsToExecute = await compareMigrations(
      migrationsRowsFromDB,
      upAndDownMigrationsFromFS[0],
    )
    await stageMigrations(migrationsToExecute)
  }
  return connectAndSetupEnvironment(configFilePath, migrationsFolder, applier)
}

const revert = (configFilePath, migrationsFolder, numberToInvert) => {
  if (process.env.NODE_ENV !== 'production') {
    const applier = (migrationsRowsFromDB, upAndDownMigrationsFromFS) => {
      if (migrationsRowsFromDB.length === 0) {
        return Promise.reject('You don’t have any migration made.')
      } else {
        const migrationsRows = migrationsRowsFromDB.reverse()
        return revertOneByOne(numberToInvert, migrationsRows, upAndDownMigrationsFromFS[1])
      }
    }
    return connectAndSetupEnvironment(configFilePath, migrationsFolder, applier)
  } else {
    return false
  }
}

module.exports = {
  run,
  revert,
}
