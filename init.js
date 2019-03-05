const {Client} = require('pg');
const fs = require("fs");


//check if connection url in package.json

// let {dbUrl, migrationTableName, migrationFolderName} = JSON.parse(require('../package.json'));


//o

const dbUrl = 'postgres://jn:test@localhost:5432/kernelpanic';
const migrationTableName = 'migrations';
const migrationFolderName = 'migrations';

if (!dbUrl) {
	dbUrl = window.prompt('please enter the db url');
}

if (!migrationTableName) {
	migrationTableName = window.prompt('please enter migration table name');	
}

if (!migrationFolderName) {
	migrationFolderName = window.prompt('please enter migration folder name');	
}

//connect to db
const client = new Client(dbUrl);

const connectToDb = async () => {
	client.connect();
	console.log('connected to db');
};


//check if migration table

const checkIfMigrationTableExists = async () => {

	const response = await client.query(`SELECT * FROM ${migrationTableName}`);
	if (!response.rows) {
		await client.query(`CREATE TABLE ${migrationTableName} (version integer PRIMARY KEY)`);
		console.log('created migrations table');
	}
	else console.log('migraitons table already created');
};

const getAllMigrationsFromFolder = async () => {

	let migrationFilesArray = []
	//get all files
	const migrationFolder = fs.readdirSync(`./${migrationFolderName}`);

	migrationFolder.forEach(file => {

		fs.readFile(file, (err, data) => {
			if (err) console.log(err);
			migrationFilesArray.push(
				{
					version: `V${migrationFolder.indexOf(file)}`,
					sql: String(data),
				});
		});
	});
	console.log(migrationFilesArray);
	return migrationFilesArray;
};

const getAllMigrationsFromTable = async () => {
	await checkIfMigrationTableExists();
	const response = await client.query(`SELECT * FROM ${migrationTableName}`);
	return response.rows;
};

const updateMigrationTable = async (newVersion) => {
	await client.query(`INSERT INTO ${migrationTableName} (version) VALUES($1)`, [newVersion]);
}

const compareMigrations = async () => {
	const table = await getAllMigrationsFromTable();
	const folder = await getAllMigrationsFromFolder();

	let migrationsToExecute = [];

	folder.forEach(async oneMigration => {

		if (!table.includes(oneMigration.version)) {

			migrationsToExecute.push(oneMigration.sql);
			await updateMigrationTable(oneMigration.version);
		};
	});

	return migrationsToExecute;
};

const joinMigrations = async () => {
	const toExecuteArray = await compareMigrations();
	const joinedQueries = toExecuteArray.join(' ');
	return joinMigrations();
};

const executeMigrations = async () => {
	const toExecuteString = await joinMigrations();
	await client.query(toExecuteString);

};

const init = async () => {
	await connectToDb();
	executeMigrations();
};

init();
module.exports = init;