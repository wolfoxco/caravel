#! /usr/bin/env node

const program = require('commander')

const migrations = require('../src/migrations')
const generate = require('../src/generate')

const helpText = [
  'Caravel helps dealing with PostgreSQL database migration. It focuses around',
  'three main features: migration managing with up and down, and generating',
  'migration up and down files.',
  '',
  'Caravel is extremely easy to use, because it simply uses bare, simple SQL.',
  'Caravel deals exclusively with SQL files, written in pure SQL, in a migration',
  'folder. By using caravel generate, you can generate [timestamp]-filename.up.sql',
  'and [timestamp]-filename.down.sql. These files need to be filled with your queries',
  'like \'CREATE TABLE users (fields);\' and \'DROP TABLE users;\', and then run',
  'caravel migrate to get everyting up and running!'
].join('\n')

program
  .version('0.1.2')
  .description(helpText)
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
  .command('revert [howMuch]')
  .alias('r')
  .description('Invert the last final(s) migration(s)')
  .action(async options => {
    const result = parseInt(options || 1)
    if (isNaN(result)) {
      console.log('Enter a valid number.')
    } else {
      await migrations.revert(program.config, program.folder, result)
    }
  })

if (!process.argv.slice(2).length) {
  program.help()
}

program.parse(process.argv)
