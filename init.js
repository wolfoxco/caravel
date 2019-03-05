require('dotenv').config();
const {Client} = require('pg');
const {exec} = require('child_process');
const fs = require("fs");

//extract from .env
const {DB_URL, MIGRATION_TABLE_NAME, MIGRATION_FOLDER_NAME} = process.env;

//create client
const client = new Client(DB_URL);


const connectToDb = async () => {
	client.connect();
	console.log('connected to db');
};

const checkIfMigrationTableExists = () => {

	client.query(`SELECT * FROM ${MIGRATION_TABLE_NAME}`)
		.then(res => {
			console.log('migration table exists');
		})
		.catch(async err => {
			await client.query(`CREATE TABLE ${MIGRATION_TABLE_NAME} (version integer PRIMARY KEY)`);
			console.log('created migrations table');
		})
};

const getAllMigrationsFromFolder = async () => {

	let migrationFilesArray = []
	//get all files
	const migrationFolder = fs.readdirSync(`./${MIGRATION_FOLDER_NAME}`);

	await migrationFolder.forEach(async oneFileName => {

		const fileNameSpliced = oneFileName.split('-');
		const versionNumber = fileNameSpliced[0];

		// console.log(versionNumber);

		const pathName = `./${MIGRATION_FOLDER_NAME}/${oneFileName}`;
		// console.log(pathName);

		const fileContent = await fs.readFileSync(pathName, "utf8", (err, data) => {
			return data;
		})

		// console.log(fileContent);

		migrationFilesArray.push({
			version: Number(versionNumber),
			sql: fileContent
		});
	});

	// console.log(migrationFilesArray);
	return migrationFilesArray;
};

const getAllMigrationsFromTable = async () => {
	await checkIfMigrationTableExists();
	const response = await client.query(`SELECT * FROM ${MIGRATION_TABLE_NAME}`);
	console.log('all migrations in table', response.rows);
	return response.rows;
};

const updateMigrationTable = async (newVersion) => {
	await client.query(`INSERT INTO ${MIGRATION_TABLE_NAME} (version) VALUES($1)`, [newVersion]);
}

const compareMigrations = async () => {
	let table = await getAllMigrationsFromTable();
	let folder = await getAllMigrationsFromFolder();

	let migrationsToExecute = [];

	const tableVersions = table.map(oneRow => {
		return oneRow.version;
	});

	folder.forEach(async oneMigration => {
		if (!tableVersions.includes(oneMigration.version)) {
			console.log('migration not in table, pushing');
			migrationsToExecute.push(oneMigration.sql);
			await updateMigrationTable(oneMigration.version);
		}
		else console.log(`migration ${oneMigration.version} already in table`);
	});

	console.log('to execute', migrationsToExecute);
	return migrationsToExecute;
};

const joinMigrations = async () => {
	const toExecuteArray = await compareMigrations();
	const joinedQueries = toExecuteArray.join(' ');
	return joinedQueries;
};

const executeMigrations = async () => {
	const toExecuteString = await joinMigrations();
	if (toExecuteString) {
		console.log('applying migrations');
		await client.query(toExecuteString);
	}
	else console.log('DB is already up to date');

};

const init = async () => {
	// await(promptShell('DB_URL'));
	await connectToDb();
	await executeMigrations();
	console.log('migrations updated !');
	return;
};

init();
module.exports = init;