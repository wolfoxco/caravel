require('dotenv').config();
const {Client} = require('pg');
const {exec} = require('child_process');
const fs = require("fs");

//extract from .env
const {DB_URL, MIGRATION_FOLDER_NAME} = process.env;

const MIGRATION_TABLE_NAME = 'caravel_migrations';

const dotEnvIsFormatted = () => {
	if(DB_URL !== undefined && MIGRATION_TABLE_NAME !== undefined && MIGRATION_FOLDER_NAME !== undefined) return true
	else return false;
}

//create client
const client = new Client(DB_URL);

const connectToDb = async () => {
	client.connect();
	console.log('connected to db');
};

const checkIfMigrationTableExists = async () => {
	const response = await client.query(`SELECT EXISTS 
		(
			SELECT 1
			FROM information_schema.tables 
			WHERE table_schema = 'public'
			AND table_name = 'caravel_migrations'
		);`);
	const {exists} = response.rows[0];

	if(!exists) {
		console.log('no migration table found, creating...');
		await client.query(`CREATE TABLE caravel_migrations (version integer PRIMARY KEY);`);
		console.log('created migrations table');
		return;
	}
	else console.log('migration table exists');
};

//get all files
const getAllMigrationsFromFolder = async () => {
	const migrationFolder = fs.readdirSync(`./${MIGRATION_FOLDER_NAME}`);

	let result = await migrationFolder.map(async oneFileName => {

		const fileNameSpliced = oneFileName.split('-');
		const versionNumber = fileNameSpliced[0];
		const pathName = `./${MIGRATION_FOLDER_NAME}/${oneFileName}`;

		const fileContent = await fs.readFileSync(pathName, "utf8", (err, data) => {
			return data;
		})

		return {
			version: Number(versionNumber),
			sql: fileContent
		}
	});

	const migrationFilesArray = await Promise.all(result);
	return migrationFilesArray;
};

const getAllMigrationsFromTable = async () => {
	const response = await client.query(`SELECT * FROM caravel_migrations`);
	console.log('all migrations in table', response.rows);
	return response.rows;
};

const compareMigrations = async (table, folder) => {

	const tableVersions = table.map(oneRow => {
		return oneRow.version;
	});

	let migrationsToExecute = folder.filter(oneMigration => {
		return (!tableVersions.includes(oneMigration.version));
	});
	return migrationsToExecute;
};

const updateMigrationTable = async (newVersion) => {
	await client.query(`INSERT INTO caravel_migrations (version) VALUES($1)`, [newVersion]);
}

const executeMigrations = async (migrationsToExecute) => {
	if (migrationsToExecute.length === 0) {
		console.log('DB up to date!');
		return;
	} else {
		const [ firstMigration, ...next ] = migrationsToExecute;
		try {
			await doStuffToMigrateThings(firstMigration);
			await executeMigrations(next);
		} catch (error) {
			console.log('ERROR with migration, version: ', firstMigration.version);
			console.error(error);
		};
	};
}

const doStuffToMigrateThings = async (migration) => {
	await client.query(migration.sql);
	console.log('SUCCESS with migration, version: ', migration.version);
	await updateMigrationTable(migration.version);
}

const init = async () => {
	// await(promptShell('DB_URL'));
	const dotEnvOk = await dotEnvIsFormatted();
	if(!dotEnvOk) {
		console.log('Please set up your .env file with keys: \n DB_URL, \n MIGRATION_TABLE_NAME, \n MIGRATION_FOLDER_NAME');
	}
	else {
		await connectToDb();
		await checkIfMigrationTableExists();
		const table = await getAllMigrationsFromTable();
		const folder = await getAllMigrationsFromFolder();
		const migrationsToExecute = await compareMigrations(table, folder);
		await executeMigrations(migrationsToExecute);

		console.log('migrations finished successfully !');
	}
	return;
};

init();
module.exports = init;