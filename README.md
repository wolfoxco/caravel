# Caravel

Maintaining migrations for databases shouldn’t be complicated. Often, depending whether framework or language you use, you should learn a whole new system and technologies to get your migrations up and running. But why woud like to recreate an other query language, when SQL is already there?

Caravel made choice to stick with simple, bare SQL, and tries to manage PostgreSQL migration files smartly and efficiently.

Caravel uses both your filesystem (and your versionning system) and writes directly into your database to make sure its state remains consistent between your migrations and the database schema.

Caravel does not have any prerequisite except of a PostgreSQL installation up and running. Add it to your `package.json`, and start using it right away.

#### In case you don’t really know what migrations is.

In most of the NoSQL world, you really don’t need migrations. Because your data defines your schema, you just write code writing into your database, and everything is working right away.

In the SQL world, we need to establish the schema before adding any new data into the database, and we need to ensure the database state remains consistent during time. We have a system called "migrations".  
A migration is simply a file, telling the database how to modify the global schema. Because your database is such an important place, and because we need to be able to share code between teams members, we need a way to ensure that everyone can get the same state than the others easily.  
Every migration is made of a database modification, and is timestamped, in order to trace easily every modification to the database. When you need to enter new data into the database, create a new migration, migrate it, and you’re good to go!

# Getting Started

## Installation

Add the tool to your `package.json`. You’ll be able to use caravel by using `yarn caravel` (or `npm run caravel`). You don’t need to rely on global package.

```bash
# Yarn users
yarn add @wolfox/caravel
```

```bash
# NPM users
npm install --save @wolfox/caravel
```

## Requirements

To be able to use caravel you need a [PostgreSQL database](https://www.postgresql.org/) and a `migration` folder containing up and down migration files.

### PostgreSQL

Installing PostgreSQL can be as easy as `brew install postgresql` or `apt-get install postgresql`, depending on your operating system. You can of course install Postgres from source, but getting it from homebrew or from your system package manager is simpler and ensure you always use a correct and up to date Postgres version.  
However, you should probably use Docker to get Postgres running. [There is plenty of](https://hub.docker.com/_/postgres) [documentation about it.](https://hackernoon.com/dont-install-postgres-docker-pull-postgres-bee20e200198) You should find what you need easily.

### Migration files

```bash
# Migrations files should be labelled like this.
timestamp-migration-name.up.sql
timestamp-migration-name.down.sql

# For example, ls into a typical folder should
# output something like this:
1552924312928-add-uuid-module.down.sql
1552924312928-add-uuid-module.up.sql
1552924312938-create-users-table.down.sql
1552924312938-create-users-table.up.sql
```

### Environment setup

Caravel needs to access your database, and so needs information connection: username, password, hostname, port, and database name. You have multiple options to pass these informations to caravel, but the easier is to configure a `DATABASE_URL` into a `.env` file at the root of your project. The other option is to setup a config file in your project and indicate the path of the file each times you’re using caravel. But more on that later.  
Your `.env` file should look like this.

```dotenv
# Replace or remove parameters as you nedd.
DATABASE_URL = postgres://username:password@hostname:port/database_name
```

## Generating your first migration

Once you went through all this process, you ready to write your first migration! Run `yarn caravel generate create user table`, and watch how caravel generated two files respectively named `[timestamp]-create-user-table.up.sql` and `[timestamp]-create-user-table.down.sql` (`[timestamp]` corresponds the timestamp at when the program has been launched).  
If you find the files, they reside in the default folder `db/migrations`. The `db` folder is extremely important, because it contains your migrations, but it could also typically contains your schema, your seeds or config files.

Now you should fill your files.

```pgsql
-- db/migrations/[timestamp]-create-user-table.up.sql
create extension if not exists "uuid-ossp";
create table users (
  id uuid primary key default uuid_generate_v4(),
  name text
);
```

```pgsql
-- db/migrations/[timestamp]-create-user-table.down.sql
drop table users;
drop extension if exists "uuid-ossp";
```

## Running your migrations

It’s done! You’re ready to run your first migrations. Execute `yarn caravel migrate`, and watch caravel generates the `caravel_migrations` table into the database, taking the `create-user-table.up.sql` and running it against the database!

That’s fine, your database is up to date! Now, every times you need to modify the database, generates a migration with caravel, and run it against the database again!

## Oops, it looks like we made a mistake…

Damn, we made a mistake in the user file! We used `name text` but it’s hard to distinguish between first and last name! Ok, don’t panic, we’ll fix that now.

First we need to rollback our last transaction. Run `yarn caravel down`. Caravel should run `create-user-table.down.sql`. Because you made things right, Postgres should have dropped the `users` table, and the `uuid-ossp` extension. That's fine, we’re in the exact same configuration as before. That’s perfect. It’s like nothing happened. We can do things right now.

Now, we need to change the file.

```pgsql
--- db/migrations/[timestamp]-create-user-table.up.sql should look like this.
create extension if not exists "uuip-ossp";
create table users (
  id uuid primary key default uuid_generate_v4(),
  first_name text,
  last_name text
);
```

That looks cool! Now, run `yarn caravel migrate`. And you’re good! The database is now in correct state! You can easily check it with a query (like `select first_name, last_name from users;`).

Now you have everything you need to continue with caravel!

# Detailled usage

Caravel can directly be called thought CLI, or can be programmatically accessed.

## CLI Usage

You have different commands you can use: `migrate`, `revert` and `generate`.

The program can be called with two global options: `--config` with the path to a specific database config file, allowing certain commands to be run against a specific database; and `--folder` with the path to the migrations folder, in case you don’t want to use the default `db/migrations` folder. Keep in mind that the path will always be resolved with a `path.resolve`.

`migrate` should be used without any further arguments and will execute your migrations in order.  
`revert` should either takes no argument or accept one int arguments, indicating how much migrations should be reverted. Now arguments defaults to one migration to revert.  
`generate` accepts an arbitrary number of arguments, which should correspond to the filename. It is also possible to use a long string without spaces. Every space will be turned into dash (`-`).

## Programmatic usage

In the same way as the CLI usage, you have access to three commands through the `migrations` object: `migrations.run`, `migrations.revert`, and `migrations.generate`. They’re all asynchronous function returning promises.

`run(configFilePath, migrationsFolder)` is a function accepting the path to the config file, and the path to the custom migrations folder and run the migration against the database.  
`revert(configFilePath, migrationsFolder, numberToInvert)` is a function accepting the path to the config file, and the path to the custom migrations folder as well as a number of migrations which need to be inverted against the database.  
`generate(migrationsFolder, name, options)` is a function accepting the path to the custom migrations folder, a filename as string (all spaces will be replaced with dashs (`-`)), and an options object, containing only a `verbose` field for now.

Just require caravel (`const Caravel = require('caravel')`) and you can call `Caravel.migrations.run`, `Caravel.migrations.revert` or `Caravel.migrations.generate` right away.

## Detailled configuration options

- The default migrations folder can be configured through the `MIGRATIONS_FOLDER_NAME` in your `.env` file, or through the `--folder` flag on the CLI.

- The database connection can be configured with a custom config file. The config file should be a JSON or a JavaScript file exposing an object corresponding to a [Node Postgres config object](https://node-postgres.com/api/client).

- In case you don’t want to provide a config file, you can just define a `DATABASE_URL` variable in your `.env` file.

- If you’re using a service like AWS or GCP, you should also define the `DATABASE_URL` directly in the environment variables, and you don’t need to use a `.env` file.

- If you did not defined a `DATABASE_URL`, the client will automatically try to find the correct parameters:

  ```js
  {
    user: process.env.PGUSER || process.env.USER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || process.env.USER,
    port: process.env.PGPORT,
    host: process.env.PGHOST,
  }
  ```

  More information could be found in the [Node Postgres documentation](https://node-postgres.com/features/connecting#environment-variables).

# How it works

## The algorithms used

Caravel covers three mains use cases: running migrations, reverting migrations, and generating migrations.

### Running migration

Caravel looks through your `migrations` folder for migrations that haven’t already been applied to your database. In order to do this, it will compare your migrations timestamp with the ones stored in the `caravel_migrations` table, and run those that need to be, updating both your project’s database and the migrations table.

You don’t need to bother about `caravel_migrations`. Caravel will create the table if it doesn’t exist. Otherwise it will use it to store the progression.

### Reverting migration

Caravel looks through the database and find the most recent migration. Recent like the last timestamp in the migrations folder, which is not inevitably the last migration made. (In case of merge, for example.) With the most recent migration, it tries to find the corresponding `[timestamp]-filename.down.sql` file, and run it against the database.  
It is strongly advised to test your down migrations files before pushing them into production.  
If you asked for more than one migration, caravel will revert them one by one, starting by the most recent to the most older.

### Generating migration

Caravel can generate migrations with proper timestamp, to do the hard work for you. When asking for new migration, caravel will fetch the actual timestamp, and creates two empty files with the timestamp and the words you indicated on the command line, separated by dashs (`-`). You can then replace the content with the code you need.

# Collaboration

Issues and Pull Requests are welcome! We’ll happily discuss them! Don’t hesitate to open one if you need a specific feature in your projects.
Forking the project is fine for us too!
