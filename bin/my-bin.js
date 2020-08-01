#!/usr/bin/env node

var join = require('path').join
var childProcess = require('child_process');
var args = process.argv.slice(2);

 args.unshift(__dirname + '/../'); 

childProcess.exec('npm start', (err, stdout) => {
if (err) console.log(err);
console.log(stdout);
})