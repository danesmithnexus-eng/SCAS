import express from 'express'
import { exec } from 'child_process'
import os from 'os'

const app = express()

const USER = os.userInfo().username
const HOME = `/home/${USER}`

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  next()
})

app.options('/shutdown',      (req, res) => res.sendStatus(204))
app.options('/start-session', (req, res) => res.sendStatus(204))
app.options('/lock-session',  (req, res) => res.sendStatus(204))

app.post('/start-session', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Starting LXQt session`)
  res.json({ ok: true, message: 'Session starting' })
  exec('touch /tmp/start-lxqt-trigger')
})

app.post('/lock-session', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Lock requested`)
  res.json({ ok: true, message: 'Returning to kiosk' })
  setTimeout(() => {
    exec('/usr/local/bin/bma-lock-session')
  }, 300)
})

app.post('/shutdown', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] Shutdown requested`)
  res.json({ ok: true, message: 'Shutting down' })
  setTimeout(() => {
    exec('sudo /sbin/shutdown -h now', (err) => {
      if (err) console.error('shutdown failed:', err.message)
    })
  }, 400)
})

app.listen(3001, '127.0.0.1', () => {
  console.log(`BMA Shutdown server listening on http://127.0.0.1:3001 (user: ${USER})`)
})