<script>
  // Dynamically load API script
  const script = document.createElement("script")
  script.src = "/api.js"
  script.onload = initApp
  document.head.appendChild(script)

  // Declare API placeholders
  let authAPI, profileAPI, moodAPI, gratitudeAPI

  function initApp() {
    // Wait until /api.js defines the APIs
    authAPI = window.authAPI
    profileAPI = window.profileAPI
    moodAPI = window.moodAPI
    gratitudeAPI = window.gratitudeAPI

    // Now safe to check auth and proceed
    checkAuth()
  }

  // --- Remaining functions ---

  function getCurrentUser() {
    const user = localStorage.getItem("mindful_current_user")
    return user ? JSON.parse(user) : null
  }

  function setCurrentUser(user) {
    localStorage.setItem("mindful_current_user", JSON.stringify(user))
  }

  async function checkAuth() {
    const token = localStorage.getItem("mindful_auth_token")
    const onAuthPage = window.location.pathname.includes("login.html") || window.location.pathname.includes("signup.html")

    if (!token) {
      if (!onAuthPage) {
        window.location.href = "login.html"
      }
      return false
    }

    try {
      const user = await profileAPI.get()
      setCurrentUser(user)
      if (onAuthPage) {
        // Already authenticated but stuck on login/signup, redirect to home
        window.location.href = "home.html"
      }
      return true
    } catch (error) {
      console.error("Auth check failed:", error)
      authAPI.logout()
      if (!onAuthPage) {
        window.location.href = "login.html"
      }
      return false
    }
  }

  function logout() {
    if (confirm("Are you sure you want to logout?")) {
      authAPI.logout()
      window.location.href = "login.html"
    }
  }

  function showNotification(message, type = "info") {
    const notification = document.createElement("div")
    notification.className = `notification ${type}`
    notification.innerHTML = `
      <div class="notification-content">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" class="notification-close">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `

    if (!document.getElementById("notification-styles")) {
      const styles = document.createElement("style")
      styles.id = "notification-styles"
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          max-width: 400px;
          padding: 15px 20px;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
          backdrop-filter: blur(10px);
          animation: slideInRight 0.3s ease-out;
        }
        .notification.success {
          background: rgba(40, 167, 69, 0.95);
          color: white;
        }
        .notification.error {
          background: rgba(220, 53, 69, 0.95);
          color: white;
        }
        .notification.info {
          background: rgba(23, 162, 184, 0.95);
          color: white;
        }
        .notification-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
        }
        .notification-close {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `
      document.head.appendChild(styles)
    }

    document.body.appendChild(notification)
    setTimeout(() => notification.remove(), 5000)
  }

  async function handleLogin(email, password) {
    try {
      const response = await authAPI.login({ email, password })
      setCurrentUser(response.user)
      showNotification("Login successful! Redirecting...", "success")
      setTimeout(() => {
        window.location.href = "home.html"
      }, 1000)
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  async function handleSignup(name, email, password) {
    try {
      const response = await authAPI.signup({ name, email, password })
      setCurrentUser(response.user)
      showNotification("Account created! Redirecting to complete your profile...", "success")
      setTimeout(() => {
        window.location.href = "profile.html?setup=true"
      }, 1500)
    } catch (error) {
      showNotification(error.message, "error")
    }
  }

  async function setMood(emoji, mood) {
    try {
      const today = new Date().toISOString().split("T")[0]
      await moodAPI.save({ emoji, mood, date: today })

      document.getElementById("mood-feedback").innerHTML = `
        <div class="mood-response">
          <p>You're feeling ${mood} today ${emoji}</p>
          <p class="mood-tip">${getMoodTip(mood)}</p>
        </div>
      `

      document.querySelectorAll(".mood-btn").forEach((btn) => btn.classList.remove("selected"))
      document.querySelector(`[data-mood="${mood}"]`).classList.add("selected")

      generateCalendar()
      showNotification("Mood saved successfully! 💚", "success")
    } catch (error) {
      showNotification("Failed to save mood", "error")
    }
  }

  function getMoodTip(mood) {
    const tips = {
      happy: "That's wonderful! 🌟 Consider sharing your joy.",
      sad: "It's okay to feel sad. 🤗 This feeling will pass.",
      anxious: "Take deep breaths. 🌬️ Try grounding exercises.",
      tired: "Rest is important. 😴 Your body is telling you something.",
      calm: "Perfect for reflection or meditation. 🧘",
      angry: "Try journaling or breathing to process anger. 🔥",
    }
    return tips[mood] || "Be kind to yourself. 💚"
  }

  async function saveGratitude() {
    try {
      const text = document.getElementById("gratitude-input").value.trim()
      if (!text) return

      const today = new Date().toISOString().split("T")[0]
      await gratitudeAPI.save({ text, date: today })

      document.getElementById("gratitude-input").value = ""
      loadGratitudes()
      showNotification("Gratitude planted 🌱", "success")
    } catch {
      showNotification("Failed to save gratitude", "error")
    }
  }

  async function loadGratitudes() {
    try {
      const today = new Date().toISOString().split("T")[0]
      const gratitudes = await gratitudeAPI.getByDate(today)
      const list = document.getElementById("gratitude-list")
      if (list) {
        list.innerHTML = gratitudes
          .map(
            (g) => `
          <div class="gratitude-item">
            <div class="gratitude-icon">🌸</div>
            <div class="gratitude-content">
              <p>${g.text}</p>
              <small>${new Date(g.created_at).toLocaleTimeString()}</small>
            </div>
          </div>`,
          )
          .join("")
      }
    } catch (err) {
      console.error("Gratitude load failed:", err)
    }
  }

  async function generateCalendar() {
    try {
      const calendar = document.getElementById("calendar")
      if (!calendar) return

      const today = new Date()
      const currentMonth = today.getMonth()
      const currentYear = today.getFullYear()

      const firstDay = new Date(currentYear, currentMonth, 1)
      const lastDay = new Date(currentYear, currentMonth + 1, 0)
      const daysInMonth = lastDay.getDate()
      const startWeekday = firstDay.getDay()

      const moods = await moodAPI.getAll()
      const moodMap = {}
      moods.forEach((m) => (moodMap[m.date] = m))

      let html = `<div class="calendar-header"><h4>${today.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })}</h4></div><div class="calendar-grid">`

      html += ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        .map((d) => `<div class="day-header">${d}</div>`)
        .join("")

      for (let i = 0; i < startWeekday; i++) html += '<div class="calendar-day empty"></div>'

      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day)
        const dateStr = date.toISOString().split("T")[0]
        const mood = moodMap[dateStr]
        const isToday = dateStr === today.toISOString().split("T")[0]

        html += `<div class="calendar-day ${isToday ? "today" : ""}" title="${
          mood ? `Feeling ${mood.mood}` : "No mood recorded"
        }">
          <span class="day-number">${day}</span>
          ${mood ? `<span class="day-mood">${mood.emoji}</span>` : ""}
        </div>`
      }

      calendar.innerHTML = html + "</div>"
    } catch (error) {
      console.error("Calendar generation failed:", error)
    }
  }

  // Expose to global scope
  window.getCurrentUser = getCurrentUser
  window.checkAuth = checkAuth
  window.logout = logout
  window.showNotification = showNotification
  window.handleLogin = handleLogin
  window.handleSignup = handleSignup
  window.setMood = setMood
  window.saveGratitude = saveGratitude
  window.loadGratitudes = loadGratitudes
  window.generateCalendar = generateCalendar
</script>
