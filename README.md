# Caravel

Caravel manages PostgreSQL migration files smartly and efficiently.

## Installation

```bash
# Yarn users
yarn add @wolfoxco/caravel
```

```bash
# NPM users
npm install --save @wolfoxco/caravel
```

## Requirements

To be able to use caravel you need **database** and a **migration folder** containing **migration files** formatted as:

`versionNumber-migrationName.sql`

**Example:**

`001-user-table.sql`

*You know the drill.*

## Environment setup

 Caravel requires the user to setup two environment variables in your project's `.env` file:

- `DATABASE_URL` is used to connect to the database you wish to update.
- `MIGRATION_FOLDER_NAME` is used to locate your migration folder and thus to search for migrations to apply.

**Example:**

Your `.env` file should look something like this:

```dotenv
DATABASE_URL = 'postgres://username:password@localhost:5432/database_name'
MIGRATION_FOLDER_NAME = './your_migration_folder'
```

## How it works

Caravel will look through your migration folder for migrations that haven't already been applied to your database. In order to do this, it will compare your migration version numbers with the ones stored in the `caravel-migrations` table, and run those that need to be, updating both your project's database and the migrations table.
*Caravel will create the `caravel_migrations` table if it doesn't already exist.*

## Usage

To execute your migrations with caravel, run:

```bash
caravel migrate # caravel -m is equivalent
```

*and let the utility do the heavy-lifting!*

## Collaboration
Issues and Pull Requests are welcome! We'll happily discuss them! Don't hesitate to open one if you need a specific feature in your projects.
Forking the project is fine for us too!
