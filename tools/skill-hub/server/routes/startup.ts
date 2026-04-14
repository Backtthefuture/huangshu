import type { FastifyInstance } from 'fastify'
import { spawn } from 'child_process'
import os from 'os'
import path from 'path'

const homedir = os.homedir()
const isWindows = os.platform() === 'win32'
const StartupRegKey = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
const ServiceName = 'skill-hub'

interface StartupStatus {
  autoStart: boolean
  running: boolean
  platform: string
}

export async function startupRoutes(app: FastifyInstance) {

  // Get startup status
  app.get('/api/startup/status', async (): Promise<StartupStatus> => {
    if (!isWindows) {
      return { autoStart: false, running: false, platform: os.platform() }
    }

    // Check if auto-start is enabled in registry
    let autoStart = false
    try {
      const { execSync } = await import('child_process')
      const result = execSync(
        `Get-ItemProperty -Path "${StartupRegKey}" -Name "${ServiceName}" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ${ServiceName}`,
        { encoding: 'utf-8', shell: 'powershell.exe' }
      )
      autoStart = result && result.trim().length > 0
    } catch {
      autoStart = false
    }

    // Check if running (simple process check)
    let running = false
    try {
      const { execSync } = await import('child_process')
      if (isWindows) {
        const result = execSync(
          `Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*skill-hub*" } | Select-Object -First 1`,
          { encoding: 'utf-8', shell: 'powershell.exe' }
        )
        running = result && result.trim().length > 0
      } else {
        const result = execSync("pgrep -f 'skill-hub' || true", { encoding: 'utf-8' })
        running = result.trim().length > 0
      }
    } catch {
      running = false
    }

    return { autoStart, running, platform: os.platform() }
  })

  // Enable auto-start
  app.post('/api/startup/enable', async () => {
    if (!isWindows) {
      return { ok: false, error: 'Auto-start is only supported on Windows' }
    }

    try {
      const { execSync } = await import('child_process')
      const startupCmd = `Set-ItemProperty -Path "${StartupRegKey}" -Name "${ServiceName}" -Value "skill-hub"`
      execSync(startupCmd, { shell: 'powershell.exe' })
      return { ok: true, message: 'Auto-start enabled' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // Disable auto-start
  app.post('/api/startup/disable', async () => {
    if (!isWindows) {
      return { ok: false, error: 'Auto-start is only supported on Windows' }
    }

    try {
      const { execSync } = await import('child_process')
      const cmd = `Remove-ItemProperty -Path "${StartupRegKey}" -Name "${ServiceName}" -ErrorAction SilentlyContinue`
      execSync(cmd, { shell: 'powershell.exe' })
      return { ok: true, message: 'Auto-start disabled' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // Start Skill Hub
  app.post('/api/startup/start', async () => {
    if (!isWindows) {
      return { ok: false, error: 'Start is only supported on Windows' }
    }

    try {
      const { execSync } = await import('child_process')
      execSync('start skill-hub', { shell: 'cmd.exe', detached: true, stdio: 'ignore' })
      return { ok: true, message: 'Skill Hub started' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })

  // Stop Skill Hub
  app.post('/api/startup/stop', async () => {
    if (!isWindows) {
      return { ok: false, error: 'Stop is only supported on Windows' }
    }

    try {
      const { execSync } = await import('child_process')
      const cmd = `Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*skill-hub*" } | Stop-Process -Force`
      execSync(cmd, { shell: 'powershell.exe' })
      return { ok: true, message: 'Skill Hub stopped' }
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  })
}
