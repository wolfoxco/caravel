const fs = require('fs')
const util = require('util')

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

const readdir = util.promisify(fs.readdir)

module.exports = {
  readFile,
  readdir,
}
