import { useState, useEffect } from 'react'

interface StartupStatus {
  autoStart: boolean
  running: boolean
  platform: string
}

export function StartupToggle() {
  const [status, setStatus] = useState<StartupStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const isWindows = status?.platform === 'win32'

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch('/api/startup/status')
      const data = await res.json()
      setStatus(data)
    } catch (e) {
      console.error('Failed to fetch startup status', e)
    }
  }

  async function handleAction(action: string) {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch(`/api/startup/${action}`, { method: 'POST' })
      const data = await res.json()
      if (data.ok) {
        setMessage(data.message || 'Success')
        await fetchStatus()
      } else {
        setMessage(data.error || 'Failed')
      }
    } catch (e: any) {
      setMessage(e.message)
    }
    setLoading(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (!status) {
    return <div className="text-sm text-slate-500">Loading...</div>
  }

  if (!isWindows) {
    return (
      <div className="text-sm text-slate-500">
        Startup management is only available on Windows
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
      <div className="text-sm font-medium text-slate-300">Windows Startup Manager</div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Auto-start on boot:</span>
        <button
          onClick={() => handleAction(status.autoStart ? 'disable' : 'enable')}
          disabled={loading}
          className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
            status.autoStart
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
          } disabled:opacity-50`}
        >
          {status.autoStart ? 'Enabled' : 'Disabled'}
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">Currently running:</span>
        <span className={`text-xs px-2 py-1 rounded ${
          status.running ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'
        }`}>
          {status.running ? 'Running' : 'Stopped'}
        </span>
      </div>

      <div className="flex gap-2 pt-2">
        {!status.running ? (
          <button
            onClick={() => handleAction('start')}
            disabled={loading}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded transition-colors disabled:opacity-50"
          >
            Start Now
          </button>
        ) : (
          <button
            onClick={() => handleAction('stop')}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs py-2 rounded transition-colors disabled:opacity-50"
          >
            Stop
          </button>
        )}
      </div>

      {message && (
        <div className="text-xs text-center text-slate-400 pt-1">{message}</div>
      )}
    </div>
  )
}
