
const join = require('path').join
const windows = require('../')
const test = require('tape')

test('stat directory size', (t) => {
  windows.statDirectory(join(__dirname, 'fixtures'))
    .then((stat) => {
      t.equal(stat.size, 278)
      t.equal(stat.count, 2)
      t.end()
    })
    .catch((err) => {
      console.error(err)
    })
})

test('stat directory files', (t) => {
  windows.statDirectory(join(__dirname, 'fixtures'))
    .then((stat) => {
      t.true(stat.files, 'gets files')
      const files = objectToArray(stat.files)
      t.equal(files.length, 2, 'counts all files')
      t.true(files[0].name, 'file has a name')
      t.true(files[0].birthtime, 'file has a birthtime')
      t.end()
    })
    .catch((err) => {
      console.error(err)
    })
})

function objectToArray (obj) {
  return Object.keys(obj).map((key) => obj[key])
}

test('convert to a windows path', (t) => {
  t.equal('some\\log\\folder', windows.toWindowsPath('some/log/folder'))
  t.end()
})

test('unc path', (t) => {
  t.equal('\\\\server\\path', windows.toUncPath('server', 'path'))
  t.end()
})

test('stat by drive letter', (t) => {
  windows.statByDriveLetter('c:')
    .then((stats) => {
      t.equal(typeof stats.freeSpace, 'number')
      t.equal(typeof stats.size, 'number')
      t.end()
    })
    .catch((err) => {
      t.fail(err)
      t.end()
    })
})