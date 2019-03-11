#! /usr/bin/env node

const program = require ('commander')

const main = require ('../main.js')

program
  .command('migrate')
  .alias('m')
  .description('Run migration files in Migration folder if necessary')
  .action(() => main.runMigrations())

if (!process.argv.slice(2).length) {
  program.help()
}

program.parse(process.argv)
