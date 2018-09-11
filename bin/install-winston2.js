#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const spawn = require('child_process').spawn

if(fs.existsSync(path.join(__dirname,'..','test','winston-2','node_modules','winston'))){
  process.exit(0)
}

let proc = spawn('npm',['install'],{cwd:path.join(__dirname,'..','test','winston-2'),stdio:'inherit'})

proc.on('close',(code)=>{
  process.exit(code||0)
})