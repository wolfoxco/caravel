const fs = require('fs')
const util = require('util')

const readFile = util.promisify(fs.readFile)
const readdir = util.promisify(fs.readdir)

module.exports = {
  readFile,
  readdir,
}
