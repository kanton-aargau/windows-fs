
'use strict'

const splitEvery = require('ramda/src/splitEvery')
const findIndex = require('ramda/src/findIndex')
const remove = require('ramda/src/remove')
const reduce = require('ramda/src/reduce')
const append = require('ramda/src/append')
const ps = require('windows-powershell')
const split = require('ramda/src/split')
const spawn = require('buffered-spawn')
const pipe = require('ramda/src/pipe')
const walk = require('fswalk')

const wmicArgs = [
  'freeSpace',
  'size'
]

/**
 * Gets various information about all the drives mounted on a given
 * `computer`
 *
 * @param {String} computer - Computer name
 * @return {Promise} - Resolves to `{ json, stdout, stderr }`
 *
 * @example
 * statDrives('computer-name').then(log)
 * // -> [{ deviceID: 'C:', freeSpace: 4324564, ...}, ...]
 */

function statDrives (computer) {
  const cmd = ps.pipe(
    `get-wmiobject Win32_LogicalDisk -computerName ${computer}`,
    'where -property DriveType -eq 3'
  )

  return ps.shell(ps.toJson(cmd))
}

/**
 * Mounts a network drive to the next available drive letter and returns a
 * the drive letter which it was mounted on.
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
 *   .then(log)
 *   .catch((err) => console.error('failed to mount', err))
 * // -> Y:
 */

function mount (unc, path, credentials) {
  if (!unc && !path) {
    throw new Error('No `unc` or `path` specified')
  }

  let args = ['use', '*', toUncPath(unc, path)]

  if (credentials) {
    if (!credentials.user || !credentials.password) {
      throw new Error(
        'Please specifiy both `user` and `password` keys for credentials'
      )
    }

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
 *   .then(log)
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
 * Gets a list of mounted drive letters and their respective unc paths.
 * 
 * @return {Array} - Array of { unc, letter } tuples
 */

function mountedDrives () {
  return spawn('net', ['use'])
    .then((io) => {
      return pipe(
        //split into lines
        split('\n'),

        // remove header
        remove(0, 6),

        // parse command
        reduce((acc, line) => {
          const status = parseStatus(line)

          // remove if no status
          if (status == null) return acc

          const letter = parseDriveLetter(line)

          // remove `Microsoft Windows Network` lines
          if (letter == null) return acc
          
          const unc = parseUNC(line)
          return append({ letter, unc }, acc)
        }, [])
      )(io.stdout)
    })
}

/**
 * Checks if a given `unc` path is already mounted. If it's mounted returns
 * the drive letter otherwise returns undefined.
 * 
 * @param  {String}  unc - Unc like path `server/share$`
 * @return {String|undefined} - The drive letter or if not found `undefined`
 *
 * @example
 * isMounted('server/share$')
 *   .then((letter) => {
 *     // mounted network drive hasn't been found
 *     if (!letter) return
 *     // found
 *   })
 */

function isMounted (unc) {
  unc = toWindowsPath(toUnc(unc))
  return mountedDrives()
    .then((drives) => {
      const i = findIndex((el) => el.unc == unc, drives)
      return i != -1
        ? drives[i].letter
        : undefined
    })
}

/**
 * Gets stats by a given drive `letter` like the current size of the hdd etc.
 * This also works for drives in a network. Use `statDrives()` when their are
 * no login credentials, otherwise use this function to avoid firewall
 * settings.
 *
 * @param {String} letter - The drive letter which the hdd was mounted on
 * @return {Promise} - A promise which resolves to `{ freeSpace, size }`
 *
 * @example
 * statByDriveLetter('Z:')
 * // -> { freeSpace: 10700152832, size: 53579083776 }
 */

function statByDriveLetter (letter) {
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
 * Gets various metadata about the directory and the files in it using
 * a recursive walk.
 *
 * @param {String} path - Absolute path
 * @returns {Object} - Object with `size` (directory size in bytes),
 * `count` (file count) and `files` (list of files in the directory and their
 * respective metadata)
 *
 * @example
 * statDirectory('c:/temp/log')
 * // -> { count: 4, size: 32636 }
 */

function statDirectory (path) {
  path = toWindowsPath(path)

  return new Promise((resolve, reject) => {
    let count = 0
    let size = 0
    let files = {}

    walk(path, onFile, onFinish)

    function onFile (path, stats) {
      files[path] = Object.assign({name: path}, stats)
      count += 1
      size += stats.size
    }

    function onFinish (err) {
      if (err) return reject(err)
      resolve({ size, count, files })
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
 * Parses a given `str` for drive letters like `Z:`. Returns null if not found.
 *
 * @private
 *
 * @example
 * parseDriveLetter('a String with the letter Y: in it')
 * // -> Y:
 */

function parseDriveLetter (str) {
  const re = /([A-Z]):/
  if (re.test(str)) {
    return re.exec(str)[0]
  } else {
    return null
  }
}

/**
 * Parses the status out of a `net use` command. Returns null if not found.
 *
 * @private
 */

function parseStatus (str) {
  const re = /^\w+/
  if (re.test(str)) {
    return re.exec(str)[0]
  } else {
    return null
  }
}

/**
 * Parses a given `str` for UNC paths like `\\server\share$\user`.
 *
 * @private
 */

function parseUNC (str) {
  return /\\\\[^\s]+/.exec(str)[0]
}

/**
 * Converts a server name to an unc path.
 *
 * @private
 */

function toUnc (server) {
  return `//${server}`
}

exports.statByDriveLetter = statByDriveLetter
exports.mountedDrives = mountedDrives
exports.toWindowsPath = toWindowsPath
exports.statDirectory = statDirectory
exports.statDrives = statDrives
exports.toUncPath = toUncPath
exports.isMounted = isMounted
exports.unmount = unmount
exports.mount = mount
