// === API Configuration ===
const API_BASE_URL = window.location.origin + "/api"
const AUTH_TOKEN_KEY = "mindful_auth_token"
const CURRENT_USER_KEY = "mindful_current_user"

// === Token Handling ===
function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

function setAuthToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

function removeAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

// === Generic API Request Helper ===
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken()
  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  }

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body)
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || data.message || "API request failed")
    }

    return data
  } catch (error) {
    console.error("API Error:", error)
    throw error
  }
}

// === Auth API ===
const authAPI = {
  async signup(userData) {
    const response = await apiRequest("/auth/signup", {
      method: "POST",
      body: userData,
    })
    setAuthToken(response.token)
    return response
  },

  async login(credentials) {
    const response = await apiRequest("/auth/login", {
      method: "POST",
      body: credentials,
    })
    setAuthToken(response.token)
    return response
  },

  logout() {
    removeAuthToken()
    localStorage.removeItem(CURRENT_USER_KEY)
  },
}

// === Profile API ===
const profileAPI = {
  async get() {
    return await apiRequest("/profile")
  },

  async update(profileData) {
    return await apiRequest("/profile", {
      method: "PUT",
      body: profileData,
    })
  },
}

// === Mood API ===
const moodAPI = {
  async save(moodData) {
    return await apiRequest("/moods", {
      method: "POST",
      body: moodData,
    })
  },

  async getAll() {
    return await apiRequest("/moods")
  },
}

// === Gratitude API ===
const gratitudeAPI = {
  async save(gratitudeData) {
    return await apiRequest("/gratitudes", {
      method: "POST",
      body: gratitudeData,
    })
  },

  async getByDate(date) {
    return await apiRequest(`/gratitudes?date=${date}`)
  },
}

// === Journal API ===
const journalAPI = {
  async save(entryData) {
    return await apiRequest("/journal", {
      method: "POST",
      body: entryData,
    })
  },

  async getAll() {
    return await apiRequest("/journal")
  },

  async delete(entryId) {
    return await apiRequest(`/journal/${entryId}`, {
      method: "DELETE",
    })
  },

  async getPublic(category = "") {
    const url = category ? `/journal/public?category=${category}` : "/journal/public"
    return await apiRequest(url)
  },
}

// === Users API ===
const usersAPI = {
  async getAll() {
    return await apiRequest("/users")
  },
}

// === Friends API ===
const friendsAPI = {
  async sendRequest(friendId) {
    return await apiRequest("/friends/request", {
      method: "POST",
      body: { friendId },
    })
  },

  async getRequests() {
    return await apiRequest("/friends/requests")
  },
}

// === Stats API ===
const statsAPI = {
  async get() {
    return await apiRequest("/stats")
  },
}

// === Export APIs to Window for Global Access ===
window.authAPI = authAPI
window.profileAPI = profileAPI
window.moodAPI = moodAPI
window.gratitudeAPI = gratitudeAPI
window.journalAPI = journalAPI
window.usersAPI = usersAPI
window.friendsAPI = friendsAPI
window.statsAPI = statsAPI
