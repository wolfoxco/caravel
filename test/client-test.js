const path = require('path')
const fs = require('fs')
const { expect } = require('chai')

// Add should to every object to do proper BDD.
require('chai').should()

const { create } = require('../src/client')

const TMP_PATH = path.resolve('./tmp')
const CONFIG_NAME = path.resolve(TMP_PATH, 'config.json')
const ENV_FILE = path.resolve('./.env')

const DB_USER = 'doctor'
const DB_HOST = 'localhost'
const DB_PORT = 5432
const DB_NAME = 'caravel_test'
const LOCALHOST = 'localhost'

function generateDatabaseURL() {
  return `postgres://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}`
}

function createTmpDirectory() {
  fs.mkdirSync(TMP_PATH)
  fs.writeFileSync(CONFIG_NAME, JSON.stringify({
    user: DB_USER,
    database: DB_NAME,
    port: DB_PORT,
    host: DB_HOST,
  }))
}

function deleteTmpDirectory() {
  fs.unlinkSync(CONFIG_NAME)
  fs.rmdirSync(TMP_PATH)
}

function testClient(client) {
  client.user.should.equal(DB_USER)
  client.database.should.equal(DB_NAME)
  client.port.should.equal(DB_PORT)
  client.host.should.equal(DB_HOST)
  expect(client.password).to.be.null
}

describe('The database client', function() {
  context('During creation', function() {
    before('Creating tmp directory', createTmpDirectory)
    after('Deleting tmp directory', deleteTmpDirectory)

    it('should be able to read a config file', async function() {
      const client = create('./tmp/config.json')
      testClient(client)
    })

    it('should be able to read a global DATABASE_URL variable', async function() {
      process.env.DATABASE_URL = generateDatabaseURL()
      const client = create()
      testClient(client)
      delete process.env.DATABASE_URL
    })

    it('should be able to read a local DATABASE_URL variable in a .env file', async function() {
      fs.writeFileSync(ENV_FILE, `DATABASE_URL = ${generateDatabaseURL()}`)
      const client = create()
      testClient(client)
      delete process.env.DATABASE_URL
      fs.unlinkSync(ENV_FILE)
    })

    it('should be able to read config from global environment', async function() {
      const client = create()
      const { PGUSER, PGDATABASE, PGPORT, PGHOST, PGPASSWORD, USER } = process.env
      expect(client.user).to.equal(PGUSER || USER)
      expect(client.database).to.equal(PGDATABASE || USER)
      expect(client.port).to.equal(PGPORT || 5432)
      expect(client.host).to.equal(PGHOST || LOCALHOST)
      expect(client.password).to.equal(PGPASSWORD || null)
    })
  })
})
