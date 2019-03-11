const path = require('path')
const fs = require('fs')
const should = require('chai').should() // eslint-disable-line
const expect = require('chai').expect

const { create } = require('../src/client')

const TMP_PATH = path.resolve('./tmp')
const CONFIG_NAME = path.resolve(TMP_PATH, 'config.json')

function createTmpDirectory() {
  fs.mkdirSync(TMP_PATH)
  fs.writeFileSync(CONFIG_NAME, JSON.stringify({
    user: 'doctor',
    database: 'caravel_test',
    port: 5432,
    host: 'localhost',
  }))
}

function deleteTmpDirectory() {
  fs.unlinkSync(CONFIG_NAME)
  fs.rmdirSync(TMP_PATH)
}

describe('The database client', function() {
  context('During creation', function() {
    before('Creating tmp directory', createTmpDirectory)
    after('Deleting tmp directory', deleteTmpDirectory)

    it('should be able to read a config file', async function() {
      const client = await create('./tmp/config.json')
      client.user.should.equal('doctor')
      client.database.should.equal('caravel_test')
      client.port.should.equal(5432)
      client.host.should.equal('localhost')
      expect(client.password).to.be.null
    })
    it('should be able to read a global DATABASE_URL variable')
    it('should be able to read a local DATABASE_URL variable in a .env file')
    it('should be able to read config from global environment')
    it('should crash if no config is given')
  })
})
