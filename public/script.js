// Load API functions
document.head.appendChild(
  Object.assign(document.createElement("script"), {
    src: "/api.js",
  }),
)

// Declare API variables (assuming they are defined in /api.js)
let authAPI, profileAPI, moodAPI, gratitudeAPI

// Utility functions
function getCurrentUser() {
  const user = localStorage.getItem("mindful_current_user")
  return user ? JSON.parse(user) : null
}

function setCurrentUser(user) {
  localStorage.setItem("mindful_current_user", JSON.stringify(user))
}

async function checkAuth() {
  const token = localStorage.getItem("mindful_auth_token")
  if (!token) {
    if (!window.location.pathname.includes("login.html") && !window.location.pathname.includes("signup.html")) {
      window.location.href = "login.html"
    }
    return false
  }

  try {
    const user = await profileAPI.get()
    setCurrentUser(user)
    return true
  } catch (error) {
    console.error("Auth check failed:", error)
    authAPI.logout()
    if (!window.location.pathname.includes("login.html") && !window.location.pathname.includes("signup.html")) {
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
        border: 1px solid rgba(40, 167, 69, 0.3);
      }

      .notification.error {
        background: rgba(220, 53, 69, 0.95);
        color: white;
        border: 1px solid rgba(220, 53, 69, 0.3);
      }

      .notification.info {
        background: rgba(23, 162, 184, 0.95);
        color: white;
        border: 1px solid rgba(23, 162, 184, 0.3);
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
        padding: 5px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .notification-close:hover {
        background: rgba(255, 255, 255, 0.2);
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

  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 5000)
}

// Auth functions for login/signup pages
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

// Mood functions
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
    happy:
      "That's wonderful! 🌟 Consider sharing your joy with someone special or write about what made you happy today.",
    sad: "It's okay to feel sad. 🤗 Remember, this feeling will pass. Consider talking to someone you trust or practicing self-care.",
    anxious:
      "Take deep breaths. 🌬️ Try some grounding exercises: name 5 things you can see, 4 you can touch, 3 you can hear.",
    tired:
      "Rest is important. 😴 Make sure you're getting enough sleep and taking breaks. Your body is telling you something.",
    calm: "Beautiful! 🧘‍♀️ This is a perfect time for reflection, meditation, or planning your day mindfully.",
    angry:
      "It's normal to feel angry sometimes. 🔥 Try some physical exercise, deep breathing, or journaling to process these feelings.",
  }
  return tips[mood] || "Remember to be kind to yourself. 💚"
}

// Gratitude functions
async function saveGratitude() {
  try {
    const gratitudeText = document.getElementById("gratitude-input").value.trim()
    if (!gratitudeText) return

    const today = new Date().toISOString().split("T")[0]
    await gratitudeAPI.save({ text: gratitudeText, date: today })

    document.getElementById("gratitude-input").value = ""
    loadGratitudes()
    showNotification("Gratitude planted in your garden! 🌱", "success")
  } catch (error) {
    showNotification("Failed to save gratitude", "error")
  }
}

async function loadGratitudes() {
  try {
    const today = new Date().toISOString().split("T")[0]
    const gratitudes = await gratitudeAPI.getByDate(today)

    const gratitudeList = document.getElementById("gratitude-list")
    if (gratitudeList) {
      gratitudeList.innerHTML = gratitudes
        .map(
          (g) => `
        <div class="gratitude-item">
          <div class="gratitude-icon">🌸</div>
          <div class="gratitude-content">
            <p>${g.text}</p>
            <small>${new Date(g.created_at).toLocaleTimeString()}</small>
          </div>
        </div>
      `,
        )
        .join("")
    }
  } catch (error) {
    console.error("Failed to load gratitudes:", error)
  }
}

// Calendar functions
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
    const startingDayOfWeek = firstDay.getDay()

    const moods = await moodAPI.getAll()
    const moodMap = {}
    moods.forEach((mood) => {
      moodMap[mood.date] = mood
    })

    let calendarHTML = `
      <div class="calendar-header">
        <h4>${today.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
      </div>
      <div class="calendar-grid">
        <div class="day-header">Sun</div>
        <div class="day-header">Mon</div>
        <div class="day-header">Tue</div>
        <div class="day-header">Wed</div>
        <div class="day-header">Thu</div>
        <div class="day-header">Fri</div>
        <div class="day-header">Sat</div>
    `

    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarHTML += '<div class="calendar-day empty"></div>'
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day)
      const dateString = date.toISOString().split("T")[0]
      const dayMood = moodMap[dateString]
      const isToday = dateString === today.toISOString().split("T")[0]

      calendarHTML += `
        <div class="calendar-day ${isToday ? "today" : ""}" title="${dayMood ? `Feeling ${dayMood.mood}` : "No mood recorded"}">
          <span class="day-number">${day}</span>
          ${dayMood ? `<span class="day-mood">${dayMood.emoji}</span>` : ""}
        </div>
      `
    }

    calendarHTML += "</div>"
    calendar.innerHTML = calendarHTML
  } catch (error) {
    console.error("Failed to generate calendar:", error)
  }
}

// Export functions for global use
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
