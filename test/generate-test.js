const path = require('path')
const fs = require('fs')
const { expect } = require('chai')

// Add should to every object to do proper BDD.
require('chai').should()

const generate = require('../src/generate')
const helpers = require('../src/helpers')

const MIGRATIONS_PATH = path.resolve('./migrations')
const CUSTOM_PATH = path.resolve('./custom-migrations')
const NAME = 'create-user-table'

function deleteMigrationsDirectory() {
  try {
    fs.accessSync(MIGRATIONS_PATH)
    const content = fs.readdirSync(MIGRATIONS_PATH)
    content.forEach(filename =>
      fs.unlinkSync(path.resolve(MIGRATIONS_PATH, filename))
    )
    fs.rmdirSync(MIGRATIONS_PATH)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error(error)
    }
  }
}

function generateFilenameRegexp(name) {
  return `.*-${name}\\.(up|down)\\.sql`
}

function checkCorrectFileGenerated(name, filename) {
  return filename.match(new RegExp(generateFilenameRegexp(name))) ? 1 : 0
}

function checkFolderExists(path) {
  return helpers.access(path, fs.constants.F_OK | fs.constants.W_OK)
}

async function generateMigrationsFolderAndFiles(migrationsPath, filenames) {
  await helpers.mkdir(migrationsPath)
  if (filenames) {
    return Promise.all(
      helpers
        .generateUpAndDownFileNames(Date.now(), filenames)
        .map(file => {
          const filePath = path.resolve(migrationsPath, file)
          helpers.writeFile(filePath, '')
        })
    )
  }
}

function checkHowMuchFileGenerated(dirContent, name) {
  const matched = dirContent.reduce((acc, val) => acc + checkCorrectFileGenerated(name, val), 0)
  expect(matched).to.equal(2)
}

describe('The migrations generation', function() {
  context('When called', function() {
    before('Deleting default migrations directory', deleteMigrationsDirectory)
    afterEach('Deleting default migrations directory', deleteMigrationsDirectory)

    it('should generate two files with a timestamp in default folder and generating it', async function() {
      await generate.migration(null, NAME)
      await checkFolderExists(MIGRATIONS_PATH)
      const dirContent = await helpers.readdir(MIGRATIONS_PATH)
      expect(dirContent.length).to.equal(2)
      checkHowMuchFileGenerated(dirContent, NAME)
    })

    it('should generate two files with a timestamp in default folder already existing', async function() {
      await generateMigrationsFolderAndFiles(MIGRATIONS_PATH)
      await generate.migration(null, NAME)
      await checkFolderExists(MIGRATIONS_PATH)
      const dirContent = await helpers.readdir(MIGRATIONS_PATH)
      expect(dirContent.length).to.equal(2)
      checkHowMuchFileGenerated(dirContent, NAME)
    })

    it('should generate two files with a timestamp without deleting old files', async function() {
      const OTHER_FILENAMES = [ 'create-posts-table' ]
      await generateMigrationsFolderAndFiles(MIGRATIONS_PATH, OTHER_FILENAMES)
      await generate.migration(null, NAME)
      const dirContent = await helpers.readdir(MIGRATIONS_PATH)
      expect(dirContent.length).to.equal(4)
      checkHowMuchFileGenerated(dirContent, NAME)
    })

    it('should generate two files with a timestamp in a custom folder', async function() {
      await generate.migration(CUSTOM_PATH, NAME)
      await checkFolderExists(CUSTOM_PATH)
      const dirContent = await helpers.readdir(CUSTOM_PATH)
      expect(dirContent.length).to.equal(2)
      checkHowMuchFileGenerated(dirContent, NAME)
      await Promise.all(dirContent.map(
        filename => helpers.unlink(path.resolve(CUSTOM_PATH, filename))
      ))
      await helpers.rmdir(CUSTOM_PATH)
    })

    it('should not generate files if no filename given', async function() {
      try {
        await migration(null, '')
        await checkFolderExists(MIGRATIONS_PATH)
      } catch (error) {
        error.code.should.equal('ENOENT')
      }
    })
  })
})
