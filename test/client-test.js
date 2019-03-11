const should = require('chai').should() // eslint-disable-line
const fs = require('fs')

const client = require('../src/client')

describe('The database client', function() {
  context('During creation', function() {
    before('Creating tmp directory', function() { fs.mkdirSync('./tmp') })
    after('Deleting tmp directory', function() { fs.rmdirSync('./tmp') })

    it('should be able to read a config file')
    it('should be able to read a global DATABASE_URL variable')
    it('should be able to read a local DATABASE_URL variable in a .env file')
    it('should be able to read config from global environment')
    it('should crash if no config is given')
  })
})
