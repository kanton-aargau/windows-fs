
'use strict'

const spawn = require('buffered-spawn')
const walk = require('fswalk')

const wmicArgs = [
  'freeSpace',
  'size'
]

/**
 * Mounts a network drive to the next available drive Letter and returns a
 * tuple the drive letter which it was mounted on.
 *
 * @param {String} unc - A UNC path like `//server`
 * @param {String} path - A path like `some/path/to/folder`
 * @param {Object} [credentials] - `user` and `password` to log into a network
 * @returns {Promise} - Resolves to the drive letter which the path was
 * mounted on, rejects when the command fails
 *
 * @example
 * // (given letter Y: is free)
 * mount('server', 'c$')
 *   .then((letter) => console.log(letter))
 *   .catch((err) => console.error('failed to mount', err))
 * // -> Y:
 */

function mount (unc, path, credentials) {
  if (!unc && !path) {
    throw new Error('No `unc` or `path` specified')
  }

  let args = ['use', '*', toUncPath(unc, path)]

  if (credentials && !(credentials.user && credentials.password)) {
    throw new Error('No `user` and `password` field specified')
  } else {
    args.push(`/user:${credentials.user}`)
    args.push(credentials.password)
  }

  return spawn('net', args)
    .then((io) => parseDriveLetter(io.stdout))
}

/**
 * Unmounts a network drive given a `letter` and returns the `letter`.
 *
 * @param {String} letter - Network drive letter
 * @returns {Promise} - Resolves to the drive letter when successful, rejects
 * when the command fails
 *
 * @example
 * // (given letter Z: is mounted)
 * unmount('Z:')
 *   .then((letter) => console.log(letter))
 *   .catch((err) => console.error('failed to unmount', err))
 * // -> Z:
 */

function unmount (letter) {
  if (!letter) {
    throw new Error('No Letter specified')
  }

  const proc = spawn(
    'net',
    ['use', letter, '/delete']
  )

  return proc.then(() => letter)
}

/**
 * Gets stats by a given drive `letter` like the current size of the hdd etc.
 * This also works for drives in a network.
 *
 * @param {String} letter - The drive letter which the hdd was mounted on
 * @return {Promise} - A promise which resolves to `{ freeSpace, size }`
 *
 * @example
 * getStats('Z:')
 * // -> { freeSpace: 10700152832, size: 53579083776 }
 */

function getStats (letter) {
  const procs = wmicArgs.map(
    (arg) => {
      return spawn(
        'wmic',
        ['logicaldisk', 'where', `DeviceID="${letter}"`, 'get', arg]
      ).then((io) => {
        let obj = {}
        obj[arg] = Number(parseNumber(io.stdout))
        return obj
      })
    }
  )

  return Promise.all(procs)
    .then((stats) => {
      return stats.reduce((acc, stat) => Object.assign(acc, stat), {})
    })
}

/**
 * Gets the directory size (in bytes) using a recursive walk.
 *
 * @param {String} path - Absolute path
 * @returns {Number} - Directory size in bytes
 *
 * @example
 * getDirSize('c:/temp/log')
 * // -> 32636
 */

function getDirSize (path) {
  path = toWindowsPath(path)

  return new Promise((resolve, reject) => {
    let count = 0

    walk(path, onFile, onFinish)

    function onFile (path, stats) {
      count += stats.size
    }

    function onFinish (err) {
      if (err) return reject(err)
      resolve(count)
    }
  })
}

/**
 * Replaces `/` with `\` so we can use an unix path and convert it to a
 * windows path.
 *
 * @param {String} path - Unix style path
 * @returns {String} - Windows style path
 *
 * @example
 * toWindowsPath('some/random/folder')
 * // -> some\random\folder
 */

function toWindowsPath (path) {
  return path.replace(/\//g, '\\')
}

/**
 * Creates a windows path given a `server` name and a unix `path`.
 *
 * @param {String} server - Server name
 * @param {String} share - Path
 *
 * @example
 * toUncPath('server', 'some/path/to/a/log')
 * // -> `\\server\some\path\to\a\log`
 */

function toUncPath (server, share) {
  return toWindowsPath(`${toUnc(server)}/${share}`)
}

/**
 * Parses a number out of a given `str`.
 *
 * @private
 */

function parseNumber (str) {
  return /\d+/.exec(str)[0]
}

/**
 * Parses a given `str` for drive letters like `Z:`
 *
 * @private
 *
 * @example
 * parseDriveLetter('a String with the letter Y: in it')
 * // -> Y:
 */

function parseDriveLetter (str) {
  return /([A-Z]):/.exec(str)[0]
}

/**
 * Converts a server name to an unc path.
 *
 * @private
 */

function toUnc (server) {
  return `//${server}`
}

exports.toWindowsPath = toWindowsPath
exports.getDirSize = getDirSize
exports.toUncPath = toUncPath
exports.getStats = getStats
exports.unmount = unmount
exports.mount = mount
