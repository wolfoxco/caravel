const { run, revert } = require('./migrations')
const generate = require('./generate')

const migrations = {
  run,
  revert,
  generate: generate.migration,
}

module.exports = {
  migrations
}
