const fs = require('fs')
const util = require('util')

const generateUpAndDownFileNames = (timestamp, name) => {
  const baseName = `${timestamp}-${name}`
  const upAndDownNames = [
    `${baseName}.up`,
    `${baseName}.down`,
  ]
  const fullNames = upAndDownNames.map(elem => `${elem}.sql`)
  return fullNames
}

const readFile = async path => {
  try {
    return await util.promisify(fs.readFile)(path)
  } catch (error) {
    if (error.code === 'ENOENT') {
      const newError = `${path} does not exists.`
      throw newError
    } else {
      throw error
    }
  }
}

const readdir = async path => {
  try {
    return await util.promisify(fs.readdir)(path)
  } catch (error) {
    if (error.code === 'ENOENT') {
      const newError = `${path} does not exists. Create the folder first.`
      throw newError
    } else {
      throw error
    }
  }
}

const access = util.promisify(fs.access)

const writeFile = util.promisify(fs.writeFile)

const mkdir = util.promisify(fs.mkdir)

const generateDatabaseURL = ({ user, password, host, port, database }) => {
  const passwordPart = password ? `:${password}` : ''
  return `postgres://${user}${passwordPart}@${host}:${port}/${database}`
}

module.exports = {
  generateUpAndDownFileNames,
  readFile,
  readdir,
  access,
  writeFile,
  mkdir,
  generateDatabaseURL,
}
