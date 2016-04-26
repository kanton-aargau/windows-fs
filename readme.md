# windows-fs

> :cyclone: Windows utilities when working with the file system. Intended for use with [electron](http://electron.atom.io/) or nodejs.

[![NPM version][version-image]][version-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Js Standard Style][standard-image]][standard-url]

## Installation

```bash
npm install windows-fs
```

## Example

```js
import { mount, statByDriveLetter } from 'windows-fs'

mount('server', 'share')
  .then(letter => statByDriveLetter(letter))
  .then(log)
// -> { freeSpace: 10700152832, size: 53579083776 }
```

## API

> Note that all **paths** are written in **unix style** format to ease the developer pain from double escaping the backslash in windows. All **other path characteristics** stay the **same** (`a:/`, `//server`).

### isMounted

Checks if a given `unc` path is already mounted. If it's mounted returns
the drive letter otherwise returns undefined.

**Parameters**

-   `unc` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Unc like path `server/share$`

**Examples**

```javascript
isMounted('server/share$')
  .then((letter) => {
    // mounted network drive hasn't been found
    if (!letter) return
    // found
  })
```

Returns **([String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)\|[undefined](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/undefined))** The drive letter or if not found `undefined`

### mount

Mounts a network drive to the next available drive letter and returns a
the drive letter which it was mounted on.

**Parameters**

-   `unc` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** A UNC path like `//server`
-   `path` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** A path like `some/path/to/folder`
-   `credentials` **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)=** `user` and `password` to log into a network

**Examples**

```javascript
// (given letter Y: is free)
mount('server', 'c$')
  .then(log)
  .catch((err) => console.error('failed to mount', err))
// -> Y:
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Resolves to the drive letter which the path was
mounted on, rejects when the command fails

### mountedDrives

Gets a list of mounted drive letters and their respective unc paths.

Returns **[Array](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)** Array of { unc, letter } tuples

### statByDriveLetter

Gets stats by a given drive `letter` like the current size of the hdd etc.
This also works for drives in a network. Use `statDrives()` when their are
no login credentials, otherwise use this function to avoid firewall
settings.

**Parameters**

-   `letter` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** The drive letter which the hdd was mounted on

**Examples**

```javascript
statByDriveLetter('Z:')
// -> { freeSpace: 10700152832, size: 53579083776 }
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** A promise which resolves to `{ freeSpace, size }`

### statDirectory

Gets the directory size (in bytes) using a recursive walk.

**Parameters**

-   `path` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Absolute path

**Examples**

```javascript
statDirectory('c:/temp/log')
// -> { count: 4, size: 32636 }
```

Returns **[Object](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object)** Object with `size` (directory size in bytes) and
`count` (file count)

### statDrives

Gets various information about all the drives mounted on a given
`computer`

**Parameters**

-   `computer` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Computer name

**Examples**

```javascript
statDrives('computer-name').then(log)
// -> [{ deviceID: 'C:', freeSpace: 4324564, ...}, ...]
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Resolves to `{ json, stdout, stderr }`

### toUncPath

Creates a windows path given a `server` name and a unix `path`.

**Parameters**

-   `server` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Server name
-   `share` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Path

**Examples**

```javascript
toUncPath('server', 'some/path/to/a/log')
// -> `\\server\some\path\to\a\log`
```

### toWindowsPath

Replaces `/` with `\` so we can use an unix path and convert it to a
windows path.

**Parameters**

-   `path` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Unix style path

**Examples**

```javascript
toWindowsPath('some/random/folder')
// -> some\random\folder
```

Returns **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Windows style path

### unmount

Unmounts a network drive given a `letter` and returns the `letter`.

**Parameters**

-   `letter` **[String](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String)** Network drive letter

**Examples**

```javascript
// (given letter Z: is mounted)
unmount('Z:')
  .then(log)
  .catch((err) => console.error('failed to unmount', err))
// -> Z:
```

Returns **[Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)** Resolves to the drive letter when successful, rejects
when the command fails

## Tests

There is an extensive test suite which is not generalized for public tests because its not independent of the system it's running on. We haven't found a way to get around that for windows-like utilities.

```bash
npm test
```

## License

[MIT][license-url]

[version-image]: https://img.shields.io/npm/v/windows-fs.svg?style=flat-square

[version-url]: https://npmjs.org/package/windows-fs

[david-image]: http://img.shields.io/david/kanton-aargau/windows-fs.svg?style=flat-square

[david-url]: https://david-dm.org/kanton-aargau/windows-fs

[standard-image]: https://img.shields.io/badge/code-standard-brightgreen.svg?style=flat-square

[standard-url]: https://github.com/feross/standard

[license-image]: http://img.shields.io/npm/l/windows-fs.svg?style=flat-square

[license-url]: ./license
