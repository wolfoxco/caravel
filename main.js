// Read .env
require('dotenv').config()

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

const MIGRATION_TABLE_NAME = 'caravel_migrations'

// Extract from .env
const { DATABASE_URL, MIGRATION_FOLDER_NAME } = process.env

const client = DATABASE_URL ? new Client(DATABASE_URL) : null

// if (DATABASE_URL === undefined)
const dotEnvIsFormatted = () => (
	DATABASE_URL &&
	MIGRATION_TABLE_NAME &&
	MIGRATION_FOLDER_NAME
)

const connectToDb = async () => {
	try {
		await client.connect()
		console.log('🎆  Connected to DB.')
		return true
	} catch (error) {
		console.error(error)
		return false
	}
}

const checkIfMigrationTableExists = async () => {
	const response = await client.query(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_name = 'caravel_migrations'
		)`
	)
	const { exists } = response.rows[0]

	if (!exists) {
		console.log('🔧 No migration table found, creating...')
		await client.query(
			`CREATE TABLE caravel_migrations (version integer PRIMARY KEY)`
		)
		console.log('👌 Migrations table created')
	} else {
		console.log('👌 Migration table exists')
	}
}

const readMigrationFileContent = async oneFileName => {
	const [ versionNumber ] = oneFileName.split('-')
	const pathName = path.resolve(MIGRATION_FOLDER_NAME, oneFileName)
	const fileContent = await promisify(fs.readFile)(pathName, "utf8")
	return {
		version: parseInt(versionNumber),
		sql: fileContent,
	}
}

/** Get all migrations from folder migration.
 * @return migrations files into an array
 */
const getAllMigrationsFromFolder = async () => {
	console.log('📄 Getting all migrations from folder...')
	const migrationFolder = await promisify(fs.readDirSync)(path.resolve(MIGRATION_FOLDER_NAME))
	const migrationFiles = migrationFolder.map(readMigrationFileContent)
	return Promise.all(migrationFiles)
}

const getAllMigrationsFromTable = async () => {
	console.log('📈 Getting all migrations in table...')
	const response = await client.query(`SELECT * FROM caravel_migrations`)
	return response.rows
}

const compareMigrations = async (table, folder) => {

	const tableVersions = table.map(oneRow => {
		return oneRow.version
	})

	let migrationsToExecute = folder.filter(oneMigration => {
		return (!tableVersions.includes(oneMigration.version))
	})
	return migrationsToExecute
}

const updateMigrationTable = (newVersion) => {
	return client.query(
		`INSERT INTO caravel_migrations (version) VALUES($1)`,
		[ newVersion ]
	)
}

const executeMigrations = async (migrationsToExecute) => {
	if (migrationsToExecute.length === 0) {
		console.log('🙌 Database is up to date!')
		return
	} else {
		const [ firstMigration, ...next ] = migrationsToExecute
		try {
			await doStuffToMigrateThings(firstMigration)
			await executeMigrations(next)
		} catch (error) {
			console.log('🚫 ERROR with migration, version: ', firstMigration.version)
			console.error(error)
		}
	}
}

const doStuffToMigrateThings = async (migration) => {
	await client.query(migration.sql)
	console.log('🚀 SUCCESS with migration, version: ', migration.version)
	await updateMigrationTable(migration.version)
}

const init = async () => {
	const dotEnvOk = await dotEnvIsFormatted()
	if (!dotEnvOk) {
		console.log('🚫 Please set up your .env file with keys: \n DATABASE_URL, \n MIGRATION_TABLE_NAME, \n MIGRATION_FOLDER_NAME')
	} else {
		const connected = await connectToDb()
		if (connected) {
			await checkIfMigrationTableExists()
			const table = await getAllMigrationsFromTable()
			const folder = await getAllMigrationsFromFolder()
			const migrationsToExecute = await compareMigrations(table, folder)
			await executeMigrations(migrationsToExecute)
			console.log('🤝 Migrations finished successfully !')
		} else {
			console.error(`Unable to connect to your database. Are you sure it is up and running? It tries to connect to ${DATABASE_URL}`)
		}
	}
}

init()
module.exports = init
