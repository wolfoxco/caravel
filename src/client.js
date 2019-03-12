const helpers = require('./helpers')
const path = require('path')
const { Client } = require('pg')
const dotenv = require('dotenv')

const createClientFromEnv = () => {
  const { DATABASE_URL } = process.env
  if (DATABASE_URL) {
    return new Client({
      connectionString: DATABASE_URL
    })
  } else {
    return null
  }
}

const createClientFromConfigFile = async configFilePath => {
  if (configFilePath) {
    const filePath = path.resolve(configFilePath)
    const config = await helpers.readFile(filePath)
    return new Client(JSON.parse(config))
  } else {
    return null
  }
}

const createClientFromNakedEnv = () => {
  const nakedClient = createClientFromEnv()
  if (nakedClient) {
    return nakedClient
  } else {
    return null
  }
}

const createClientFromDotenvEnv = () => {
  dotenv.config()
  const dotEnvClient = createClientFromEnv()
  if (dotEnvClient) {
    return dotEnvClient
  } else {
    return null
  }
}

const create = async configFilePath => {
  return (
    await createClientFromConfigFile(configFilePath)
    || createClientFromNakedEnv()
    || createClientFromDotenvEnv()
    || new Client()
  )
}

const connect = async client => {
  try {
    await client.connect()
    console.log('🎆  Connected to DB.')
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

Client.prototype.databaseURL = Client.prototype.databaseURL || function() {
  return helpers.generateDatabaseURL(this)
}

module.exports = {
  create,
  connect,
}
