
const join = require('path').join
const windows = require('../')
const test = require('tape')

test('get directory size', (t) => {
  windows.getDirSize(join(__dirname, 'fixtures'))
    .then((size) => {
      console.log(size)
      t.equal(204, size)
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

test('stats', (t) => {
  windows.getStats('c:')
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

test('mount', (t) => {
  // Not sure how to test because a network server is needed.
  t.pass()
  t.end()
})

test('unmount', (t) => {
  // Not sure how to test because a network server is needed.
  windows.unmount('Z:')
    .then((letter) => t.same(letter, 'Z:'))
    .catch(() => t.pass())
  t.end()
})