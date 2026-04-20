import express from 'express'
import { exec, spawn } from 'child_process'
import os from 'os'

const app = express()

const USER    = os.userInfo().username        // ← auto-detected, no manual change needed
const DISPLAY = ':0'
const HOME    = `/home/${USER}`
const ENV     = {
  ...process.env,
  DISPLAY,
  HOME,
  XAUTHORITY: `${HOME}/.Xauthority`,
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  next()
})

app.options('/shutdown',      (req, res) => res.sendStatus(204))
app.options('/start-session', (req, res) => res.sendStatus(204))

app.post('/start-session', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Starting LXQt session…`)
  res.json({ ok: true, message: 'Session starting…' })

  exec('pkill -x openbox', () => {
    const lxqt = spawn('startlxqt', { env: ENV, detached: false })

    lxqt.on('close', (code) => {
      console.log(`[${new Date().toLocaleTimeString()}] LXQt exited (code ${code}). Returning to kiosk…`)

      exec('openbox &', { env: ENV }, () => {
        setTimeout(() => {
          exec('xdg-open http://localhost', { env: ENV }, (err) => {
            if (err) {
              exec('firefox http://localhost', { env: ENV }, (err2) => {
                if (err2) exec('chromium-browser http://localhost', { env: ENV })
              })
            }
          })
        }, 2500)
      })
    })

    lxqt.on('error', (err) => {
      console.error('Failed to start LXQt:', err.message)
    })
  })
})

app.post('/shutdown', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Shutdown requested — powering off…`)
  res.json({ ok: true, message: 'Shutting down…' })

  setTimeout(() => {
    exec('sudo /sbin/shutdown -h now', (err) => {
      if (err) console.error('shutdown failed:', err.message)
    })
  }, 400)
})

app.listen(3001, '127.0.0.1', () => {
  console.log(`BMA Shutdown server listening on http://127.0.0.1:3001 (user: ${USER})`)
})