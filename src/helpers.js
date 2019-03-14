const fs = require('fs')
const util = require('util')

const readFile = async (path, options) => {
  try {
    return await util.promisify(fs.readFile)(path, options)
  } catch (error) {
    if (error.code === 'ENOENT') {
      const newError = `${path} does not exists.`
      throw newError
    } else {
      throw error
    }
  }
}

const readdir = util.promisify(fs.readdir)

const generateDatabaseURL = ({ user, password, host, port, database }) => {
  const passwordPart = password ? `:${password}` : ''
  return `postgres://${user}${passwordPart}@${host}:${port}/${database}`
}

module.exports = {
  readFile,
  readdir,
  generateDatabaseURL,
}
