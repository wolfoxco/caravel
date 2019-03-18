#! /usr/bin/env node

const program = require('commander')

const migrations = require('../src/migrations')
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
    await migrations.run(program.config, program.folder)
  })

program
  .command('generate [name...]')
  .alias('g')
  .description('Generate correct migration in migrations folder')
  .action(async options => {
    await generate.migration(program.folder, options.join('-'))
  })

program
  .command('down [howMuch]')
  .alias('d')
  .description('Invert the last final(s) migration(s)')
  .action(async options => {
    const result = parseInt(options || 1)
    if (isNaN(result)) {
      console.log('Enter a valid number.')
    } else {
      await migrations.invert(program.config, program.folder, result)
    }
  })

if (!process.argv.slice(2).length) {
  program.help()
}

program.parse(process.argv)
