const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const helpers = require('./helpers')
const { MIGRATIONS_FOLDER } = require('./constants')

const writeMigrationFile = options => filename => {
  if (options.verbose) {
    console.log(chalk.bold.green(`Creating ${filename}...`))
  }
  return helpers.writeFile(filename, '-- Your migration code here.')
}

const turnIntoAbsolutePath = migrationsPath => filename => {
  return path.resolve(migrationsPath, filename)
}

const handleAccessError = (migrationsPath, options) => error => {
  if (error.code === 'ENOENT') {
    if (options.verbose) {
      console.log(chalk.bold.green('No corresponding migration folder. Creating...'))
    }
    return helpers.mkdir(migrationsPath, { recursive: true })
  } else {
    throw error
  }
}

const generateFiles = (migrationsPath, name, options) => () => Promise.all(
  helpers.generateUpAndDownFileNames(Date.now(), name)
    .map(turnIntoAbsolutePath(migrationsPath))
    .map(writeMigrationFile(options))
)

const createMigrationsFolderAndFiles = (migrationsPath, name, options) => {
  return helpers.access(migrationsPath, fs.constants.F_OK | fs.constants.W_OK)
    .catch(handleAccessError(migrationsPath, options))
    .then(generateFiles(migrationsPath, name, options))
    .catch(error => {
      if (options.verbose) {
        console.error(error)
      }
    })
}

const migration = (migrationsFolder, name, options = { verbose: true }) => {
  if (name.length === 0) {
    if (options.verbose) {
      console.error(chalk.bold.red('You did not specified migration name. Aborting.'))
    }
  } else {
    const migrationsPath = path.resolve(migrationsFolder || MIGRATIONS_FOLDER)
    return createMigrationsFolderAndFiles(migrationsPath, name, options)
  }
}

module.exports = {
  migration,
}
