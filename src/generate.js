const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const helpers = require('./helpers')
const { MIGRATIONS_FOLDER } = require('./constants')

const writeMigrationFile = filename => {
  console.log(chalk.bold.green(`Creating ${filename}...`))
  return helpers.writeFile(filename, '-- Your migration code here.')
}

const turnIntoAbsolutePath = migrationsPath => filename => {
  return path.resolve(migrationsPath, filename)
}

const handleAccessError = migrationsPath => error => {
  if (error.code === 'ENOENT') {
    console.log(chalk.bold.green('No corresponding migration folder. Creating...'))
    return helpers.mkdir(migrationsPath)
  } else {
    throw error
  }
}

const generateFiles = (migrationsPath, name) => () => Promise.all(
  helpers.generateUpAndDownFileNames(Date.now(), name)
    .map(turnIntoAbsolutePath(migrationsPath))
    .map(writeMigrationFile)
)

const createMigrationsFolderAndFiles = (migrationsPath, name) => {
  return helpers.access(migrationsPath, fs.constants.F_OK | fs.constants.W_OK)
    .catch(handleAccessError(migrationsPath))
    .then(generateFiles(migrationsPath, name))
    .catch(error => console.error(error))
}

const migration = (migrationsFolder, name) => {
  if (name.length === 0) {
    console.error(chalk.bold.red('You did not specified migration name. Aborting.'))
  } else {
    const migrationsPath = path.resolve(migrationsFolder || MIGRATIONS_FOLDER)
    return createMigrationsFolderAndFiles(migrationsPath, name)
  }
}

module.exports = {
  migration,
}
