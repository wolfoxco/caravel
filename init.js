const {Client} = require('pg');
const {exec} = require('child_process');
const fs = require("fs");

let dbUrl = 'postgres://jn:test@localhost:5432/kernelpanic';
let migrationTableName = 'migrations';
let migrationFolderName = 'migrations';

//connect to db
const client = new Client(dbUrl);

if (!dbUrl) {
	dbUrl = window.prompt('please enter the db url');
}

if (!migrationTableName) {
	migrationTableName = window.prompt('please enter migration table name');	
}

if (!migrationFolderName) {
	migrationFolderName = window.prompt('please enter migration folder name');	
}

const connectToDb = async () => {
	client.connect();
	console.log('connected to db');
};

const promptShell = async (asked) => {
	return new Promise( async (resolve, reject) => {

		let cmd;

		switch (asked) {
			case 'dbUrl': {
				console.log('asked for db url');
				cmd = 'PS1="database URL: "';
				break;
			};
			case 'migrationFolderName': {
				cmd = 'PS1="migration folder name: "';
				break;
			};
			case 'migrationTableName': {
				cmd = 'PS1="migration table name: "';
				break;
			};
			default: return;
		};

		console.log(cmd);

		await exec(cmd, (err, stdout, stderr) => {
			if(err) {
				console.log('error prompt');
				reject(err);
			} else {
				console.log('prompt resolve');
				resolve({stdout, stderr});
			}
		})
	});
};

//check if migration table

const checkIfMigrationTableExists = () => {

	client.query(`SELECT * FROM ${migrationTableName}`)
		.then(res => {
			console.log('migration table exists');
		})
		.catch(async err => {
			await client.query(`CREATE TABLE ${migrationTableName} (version integer PRIMARY KEY)`);
			console.log('created migrations table');
		})
};

const getAllMigrationsFromFolder = async () => {

	let migrationFilesArray = []
	//get all files
	const migrationFolder = fs.readdirSync(`./${migrationFolderName}`);

	await migrationFolder.forEach(async oneFileName => {

		const fileNameSpliced = oneFileName.split('-');
		const versionNumber = fileNameSpliced[0];

		// console.log(versionNumber);

		const pathName = `./${migrationFolderName}/${oneFileName}`;
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
	const response = await client.query(`SELECT * FROM ${migrationTableName}`);
	console.log('all migrations in table', response.rows);
	return response.rows;
};

const updateMigrationTable = async (newVersion) => {
	await client.query(`INSERT INTO ${migrationTableName} (version) VALUES($1)`, [newVersion]);
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
	console.log('execute string', toExecuteString);
	if (toExecuteString) {
		console.log('applying migrations');
		await client.query(toExecuteString);
	}
	else console.log('DB is already up to date');

};

const init = async () => {
	// await(promptShell('dbUrl'));
	await connectToDb();
	await executeMigrations();
	console.log('migrations updated !');
	return;
};

init();
module.exports = init;