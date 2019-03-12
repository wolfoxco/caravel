#! /usr/bin/env node

const program = require('commander')

const main = require('../src/main')
const generate = require('../src/generate')

program
  .version('0.1.0')
  .option('-c, --config <path>', 'Specify connection database config file')
  .option('-f, --folder <path>', 'Specify migrations folder path')

program
  .command('migrate')
  .alias('m')
  .description('Run migration files in migrations folder if necessary')
  .action(async () => {
    await main.runMigrations(program.config, program.folder)
  })

program
  .command('generate [name...]')
  .alias('g')
  .description('Generate correct migration in migrations folder')
  .action(async options => {
    await generate.migration(program.folder, options.join('-'))
  })

if (!process.argv.slice(2).length) {
  program.help()
}

program.parse(process.argv)
