#!/usr/bin/env node
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const pkgRoot = path.resolve(__dirname, '..')
const serverEntry = path.join(pkgRoot, 'dist', 'server', 'index.js')

if (!fs.existsSync(serverEntry)) {
  console.error('\x1b[31m[claude-skill-hub] Build output missing.\x1b[0m')
  console.error('Expected:', serverEntry)
  console.error('Run `npm run build` in the package directory, or reinstall.')
  process.exit(1)
}

const child = spawn(process.execPath, [serverEntry], {
  stdio: 'inherit',
  env: process.env,
  cwd: process.cwd(),
})

child.on('exit', (code) => process.exit(code ?? 0))

const forward = (sig) => () => child.kill(sig)
process.on('SIGINT', forward('SIGINT'))
process.on('SIGTERM', forward('SIGTERM'))
