
const join = require('path').join
const windows = require('../')
const test = require('tape')

test('stat directory size', (t) => {
  windows.statDirectory(join(__dirname, 'fixtures'))
    .then((stat) => {
      t.equal(204, stat.size)
      t.equal(1, stat.count)
      t.end()
    })
    .catch((err) => {
      console.error(err)
    })
})

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