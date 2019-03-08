# Caravel
Caravel manages PostgreSQL migration files smartly and efficiently.

## Installation

`$ npm install -g @wolfoxco/caravel`

## Requirements

To be able to use caravel you need **database** and a **migration folder** containing **migration files** formatted as:

`versionNumber-migrationName.sql`

**Example:**

`001-user-table.sql`

*You know the drill.*

## Environment setup
 Caravel requires the user to setup to environment variables in your project's `.env` file:
 `DATABASE_URL` is used to connect to the database you wish to update.
 `MIGRATION_FOLDER_NAME` is used to locate your migration folder and thus to search for migrations to apply.
 
**Example:**
Your `.env` file should look something like this:

`DATABASE_URL = 'postgres://username:password@localhost:5432/database_name'
MIGRATION_FOLDER_NAME = './your_migration_folder'`

## How it works
Caravel will look through your migration folder for migrations that haven't already been applied to your database. In order to do this, it will compare your migration version numbers with the ones stored in the `caravel-migrations` table, and run those that need to be ran, updating both your project's database and the migrations table.
*Caravel will create the `caravel_migrations` table if it doesn't already exist.*

## Usage
To execute your migrations with caravel, run:

`$ caravel migrate`

*and let the utility do the heavy-lifting!*

## Collaboration
Pull request will happily be merged in the project if they are deemed useful and bug-free.
Feel free to fork the project as you like.

## License
Caravel falls under the **MIT** Licence agreement.


