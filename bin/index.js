#! /usr/bin/env node

const program = require('commander')

const main = require('../src/main.js')

program
  .version('0.1.0')
  .option('-c, --config <path>', 'Specify connection database config file')

program
  .command('migrate')
  .alias('m')
  .description('Run migration files in migrations folder if necessary')
  .action(() => {
    main.runMigrations(program.config)
  })

if (!process.argv.slice(2).length) {
  program.help()
}

program.parse(process.argv)
