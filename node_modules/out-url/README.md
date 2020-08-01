# out-url
Light Weight, Cross platform Node.js Utility to open urls in browser with zero dependencies

[![NPM](https://nodei.co/npm/out-url.svg?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/out-url/)


![](https://img.shields.io/npm/v/out-url) ![](https://img.shields.io/bundlephobia/minzip/out-url) ![](https://img.shields.io/bundlephobia/min/out-url) ![](https://img.shields.io/npm/dt/out-url) ![](https://img.shields.io/github/issues/azhar22k/ourl) ![](https://img.shields.io/github/issues-pr/azhar22k/ourl)

## Supported platforms
- Android
- Windows
- MacOS
- Linux

### Example
```javascript
// Plain example
const { open } = require('out-url');
open('http://itz-azhar.github.io');
//or
require('out-url').open('http://itz-azhar.github.io');
```

```javascript
// With error handling
const { open } = require('out-url');
open('http://itz-azhar.github.io')
  .then(res => console.log('RES', res)) // Resolves with Done!
  .catch(err => console.log('ERR', err));
```

```javascript
// Using async/await
const { open } = require('out-url');

const foo = async () {
  await open('http://itz-azhar.github.io');
}
```
