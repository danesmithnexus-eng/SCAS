<template>
  <div class="app-wrapper">

    <!-- Page Title Logo & Text -->
    <div class="page-header">
      <div class="title-logo">
        <img src="./assets/bma-logo.png" alt="BMA Logo" class="logo" />
        <div class="page-title">
          <span class="green">Baliwag Maritime Academy</span>
        </div>
        <div class="page-desc">
          <p>Knowledge · Discipline · Excellence</p>
        </div>
      </div>
    </div>

    <!-- Role Buttons -->
    <div class="field-btn">
      <button class="btn-roles" :class="{ active: selectedRole === 'applicant' }" @click="selectRole('applicant')">
        <i class="fa-solid fa-user-group fa-lg"></i>
        <span>Log in as Applicant</span>
      </button>
      <button class="btn-roles" :class="{ active: selectedRole === 'student' }" @click="selectRole('student')">
        <i class="fa-solid fa-user-group fa-lg"></i>
        <span>Log in as Student / Faculty</span>
      </button>
    </div>

    <!-- Login Form -->
    <LoginForm
      v-if="selectedRole"
      v-model:studentId="studentId"
      v-model:purpose="purpose"
      :role="selectedRole"
      :logged-in="loggedIn"
      :loading="loading"
      :error-msg="errorMsg"
      @clear-error="errorMsg = ''"
      @submit="handleLogin"
      @logout="handleLogout"
    />

    <!-- Welcome message after login -->
    <transition name="banner">
      <div class="welcome-banner" v-if="loggedIn">
        🎓 Welcome, <strong>{{ username }}</strong>! Your session is now active.
      </div>
    </transition>

    <!-- Shut Down button — shown when not logged in -->
    <transition name="fade-up">
      <div class="shutdown-zone" v-if="showShutdown">
        <button class="btn-shut-down" @click="handleShutDown" :disabled="shuttingDown">
          <i class="fa-solid fa-power-off"></i>
          {{ shuttingDown ? 'Shutting down…' : 'Shut Down' }}
        </button>
      </div>
    </transition>

    <div class="app-footer">
      © {{ currentYear }} Baliwag Maritime Academy · Powered by Vue.js
    </div>

  </div>
</template>

<script>
import LoginForm from './components/LoginForm.vue'

const PC_NUMBER    = '01'
const EMAIL_DOMAIN = '@bma.edu.ph'

/* backend */
const SHUTDOWN_API      = 'http://localhost:3001/shutdown'
const SESSION_START_API = 'http://localhost:3001/start-session'

const LOG_API = 'URL_TO_LOG_API_ENDPOINT' // ← replace with your actual logging endpoint

const REGISTERED_IDS = {
  applicant: ['APP-2026-0001', 'APP-2026-0002', 'APP-2026-0003'],
  student:   ['23132.cruz', '24004.jimenez', '12345.rivera', 'STU-2026-0001'],
}

export default {
  name: 'App',
  components: { LoginForm },

  data() {
    return {
      selectedRole: null,
      studentId:    '',
      username:     '',
      purpose:      '',
      loggedIn:     false,
      loading:      false,
      errorMsg:     '',
      currentYear:  new Date().getFullYear(),
      logs:         [],

      showShutdown: true,
      shuttingDown: false,
    }
  },

  mounted() {
    this.focusInput()
    this.focusTimer = setInterval(this.focusInput, 5000)

    const savedLogs = localStorage.getItem('bma_logs')
    if (savedLogs) {
      try { this.logs = JSON.parse(savedLogs) } catch (e) { this.logs = [] }
    }
  },

  beforeUnmount() {
    clearInterval(this.focusTimer)
  },

  methods: {
    focusInput() {
      const el = document.getElementById('studentId')
      if (el) el.focus()
    },

    cleanUsername(raw) {
      return raw.trim().replace(EMAIL_DOMAIN, '').trim()
    },

    now() {
      return new Date().toLocaleTimeString('en-PH', { hour12: false })
    },

    today() {
      return new Date().toLocaleDateString('en-PH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      })
    },

    addLog(status, username) {
      const entry = {
        pcNumber: PC_NUMBER,
        username,
        purpose:  this.purpose || '—',
        timeIn:   this.now(),
        date:     this.today(),
        status:   status || 'UNKNOWN',
      }
      this.logs.push(entry)
      localStorage.setItem('bma_logs', JSON.stringify(this.logs))
      return entry
    },

    selectRole(role) {
      if (this.loggedIn) return
      this.selectedRole = role
      this.studentId    = ''
      this.username     = ''
      this.purpose      = ''
      this.errorMsg     = ''
      this.showShutdown = true
    },

    async handleLogin() {
      if (this.loggedIn) return
      this.errorMsg     = ''
      this.showShutdown = false

      const cleaned = this.cleanUsername(this.studentId)

      if (!cleaned)       { this.errorMsg = 'Please enter your username.'; return }
      if (!this.purpose)  { this.errorMsg = 'Please select a purpose.';    return }

      this.loading = true
      await new Promise(r => setTimeout(r, 800))

      const validIds = REGISTERED_IDS[this.selectedRole] || []

      if (validIds.includes(cleaned)) {
        this.username  = cleaned
        this.studentId = cleaned
        this.loggedIn  = true

        const entry = this.addLog('SUCCESS', cleaned)

        // Send log to API
        try {
          await fetch(LOG_API, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(entry),
          })
        } catch {
          console.warn('Offline — log entry not sent to API.')
        }

        // Tell the server to kill Openbox and launch LXQt
        try {
          await fetch(SESSION_START_API, { method: 'POST' })
        } catch {
          console.error('Could not reach shutdown-server to start session.')
        }

      } else {
        this.errorMsg = 'Username not recognized. Please try again.'
        this.addLog('FAILED', cleaned)
      }

      this.loading = false
    },

    async handleLogout() {
      const entry = this.addLog('LOGOUT', this.username)

      this.loggedIn     = false
      this.studentId    = ''
      this.username     = ''
      this.purpose      = ''
      this.errorMsg     = ''
      this.showShutdown = true

      try {
        await fetch(LOG_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(entry),
        })
      } catch { /* offline */ }
    },

    async handleShutDown() {
      if (!confirm('Are you sure you want to shut down the computer?')) return
      this.shuttingDown = true
      try {
        await fetch(SHUTDOWN_API, { method: 'POST' })
      } catch {
        console.info('Shutdown signal sent.')
      }
    },

    clearLogs() {
      this.logs = []
      localStorage.removeItem('bma_logs')
    },
  },
}
</script>

<!-- ── Global styles ── -->
<style>
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Poppins', sans-serif;
  color: #0d0f14;
  min-height: 100vh;
}

@font-face {
  font-family: 'AllrounderMonumentTest-Medium';
  src: url('./assets/AllrounderMonumentTest-Medium.otf') format('opentype');
  font-weight: 700;
  font-style: normal;
}
</style>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;500;600;700&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css');

.app-wrapper {
  min-height: 80vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
  padding: 60px 16px 80px;
  position: relative;
  overflow: hidden;
}

.app-wrapper > * {
  position: relative;
  z-index: 1;
}

/* ── Page Header ── */
.page-header {
  text-align: center;
  display: flex;
  font-weight: bold;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.title-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.logo {
  width: 150px;
  height: 150px;
  object-fit: contain;
  border-radius: 50%;
  display: block;
}

.page-title {
  font-family: 'AllrounderMonumentTest-Medium', sans-serif;
  font-size: 30px;
  color: #0d0f14;
  line-height: 1;
  letter-spacing: 0.04em;
}

.page-title .green {
  color: #00611E;
  font-style: normal;
}

.page-desc {
  font-family: 'AllrounderMonumentTest-Medium', sans-serif;
  font-size: 12px;
  color: #00611E;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Role Buttons ── */
.field-btn {
  display: flex;
  gap: 10px;
  width: 90%;
}

.btn-roles {
  font-family: 'Poppins', sans-serif;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  padding: 10px 15px;
  background: #00611E;
  color: #f5f2eb;
  border: 2px solid #00611E;
  cursor: pointer;
  width: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.2s ease;
}

.btn-roles.active {
  background: #ffffff;
  color: #00611E;
  border: 2px solid #00611E;
  cursor: default;
}

/* ── Shutdown zone ── */
.shutdown-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
}

.btn-shut-down {
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 13px 32px;
  background: #e84b2a;
  color: #f5f2eb;
  border: 2px solid #e84b2a;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: background 0.2s, border-color 0.2s;
}

.btn-shut-down:hover    { background: #c1270b; border-color: #c1270b; }
.btn-shut-down:disabled { opacity: 0.45; cursor: not-allowed; }

/* ── Welcome Banner ── */
.welcome-banner {
  position: fixed;
  bottom: 7vh;
  font-family: 'Poppins', sans-serif;
  font-size: 13px;
  padding: 10px 20px;
  background: #edfaf3;
  border: 2px solid #00611E;
  color: #00611E;
  max-width: 400px;
  width: 100%;
  text-align: center;
}

/* ── Transitions ── */
.banner-enter-active { transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
.banner-leave-active { transition: all 0.2s ease; }
.banner-enter-from,
.banner-leave-to     { opacity: 0; transform: translateY(-10px); }

.fade-up-enter-active { transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.fade-up-leave-active { transition: all 0.2s ease; }
.fade-up-enter-from,
.fade-up-leave-to     { opacity: 0; transform: translateY(12px); }

/* ── Footer ── */
.app-footer {
  font-family: 'Poppins', sans-serif;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #b5b0a8;
  position: fixed;
  bottom: 10px;
}
</style>