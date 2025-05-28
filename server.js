const express = require("express")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { Pool } = require("pg")
const path = require("path")
require("dotenv").config()

const app = express()
const PORT = process.env.PORT || 3000

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// Routes

// Auth Routes
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body

    // Check if user exists
    const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: "Email already exists" })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await pool.query(
      "INSERT INTO users (name, email, password, join_date) VALUES ($1, $2, $3, NOW()) RETURNING id, name, email, join_date, profile_complete",
      [name, email, hashedPassword],
    )

    const user = result.rows[0]
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        joinDate: user.join_date,
        profileComplete: user.profile_complete,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email])
    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    const user = result.rows[0]

    // Check password
    const validPassword = await bcrypt.compare(password, user.password)
    if (!validPassword) {
      return res.status(400).json({ error: "Invalid credentials" })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET)

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        age: user.age,
        gender: user.gender,
        bio: user.bio,
        joinDate: user.join_date,
        profileComplete: user.profile_complete,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Profile Routes
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, age, gender, bio, join_date, profile_complete FROM users WHERE id = $1",
      [req.user.userId],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = result.rows[0]
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      bio: user.bio,
      joinDate: user.join_date,
      profileComplete: user.profile_complete,
    })
  } catch (error) {
    console.error("Profile fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { name, age, gender, bio } = req.body

    const result = await pool.query(
      "UPDATE users SET name = $1, age = $2, gender = $3, bio = $4, profile_complete = true WHERE id = $5 RETURNING id, name, email, age, gender, bio, join_date, profile_complete",
      [name, age, gender, bio, req.user.userId],
    )

    const user = result.rows[0]
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      age: user.age,
      gender: user.gender,
      bio: user.bio,
      joinDate: user.join_date,
      profileComplete: user.profile_complete,
    })
  } catch (error) {
    console.error("Profile update error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Mood Routes
app.post("/api/moods", authenticateToken, async (req, res) => {
  try {
    const { emoji, mood, date } = req.body

    // Check if mood already exists for this date
    const existing = await pool.query("SELECT * FROM moods WHERE user_id = $1 AND date = $2", [req.user.userId, date])

    let result
    if (existing.rows.length > 0) {
      // Update existing mood
      result = await pool.query(
        "UPDATE moods SET emoji = $1, mood = $2, updated_at = NOW() WHERE user_id = $3 AND date = $4 RETURNING *",
        [emoji, mood, req.user.userId, date],
      )
    } else {
      // Create new mood
      result = await pool.query("INSERT INTO moods (user_id, emoji, mood, date) VALUES ($1, $2, $3, $4) RETURNING *", [
        req.user.userId,
        emoji,
        mood,
        date,
      ])
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error("Mood save error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/moods", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM moods WHERE user_id = $1 ORDER BY date DESC", [req.user.userId])

    res.json(result.rows)
  } catch (error) {
    console.error("Moods fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Gratitude Routes
app.post("/api/gratitudes", authenticateToken, async (req, res) => {
  try {
    const { text, date } = req.body

    const result = await pool.query("INSERT INTO gratitudes (user_id, text, date) VALUES ($1, $2, $3) RETURNING *", [
      req.user.userId,
      text,
      date,
    ])

    res.json(result.rows[0])
  } catch (error) {
    console.error("Gratitude save error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/gratitudes", authenticateToken, async (req, res) => {
  try {
    const { date } = req.query
    let query = "SELECT * FROM gratitudes WHERE user_id = $1"
    const params = [req.user.userId]

    if (date) {
      query += " AND date = $2"
      params.push(date)
    }

    query += " ORDER BY created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Gratitudes fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Journal Routes
app.post("/api/journal", authenticateToken, async (req, res) => {
  try {
    const { content, category, isPublic } = req.body

    const result = await pool.query(
      "INSERT INTO journal_entries (user_id, content, category, is_public) VALUES ($1, $2, $3, $4) RETURNING *",
      [req.user.userId, content, category, isPublic],
    )

    // Get user name for response
    const userResult = await pool.query("SELECT name FROM users WHERE id = $1", [req.user.userId])
    const entry = result.rows[0]
    entry.user_name = userResult.rows[0].name

    res.json(entry)
  } catch (error) {
    console.error("Journal save error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/journal", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT j.*, u.name as user_name 
       FROM journal_entries j 
       JOIN users u ON j.user_id = u.id 
       WHERE j.user_id = $1 
       ORDER BY j.created_at DESC`,
      [req.user.userId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Journal fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.delete("/api/journal/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const result = await pool.query("DELETE FROM journal_entries WHERE id = $1 AND user_id = $2 RETURNING *", [
      id,
      req.user.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Journal entry not found" })
    }

    res.json({ message: "Journal entry deleted" })
  } catch (error) {
    console.error("Journal delete error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Public journal entries for support group
app.get("/api/journal/public", authenticateToken, async (req, res) => {
  try {
    const { category } = req.query
    let query = `
      SELECT j.*, u.name as user_name 
      FROM journal_entries j 
      JOIN users u ON j.user_id = u.id 
      WHERE j.is_public = true
    `
    const params = []

    if (category) {
      query += " AND j.category = $1"
      params.push(category)
    }

    query += " ORDER BY j.created_at DESC"

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error) {
    console.error("Public journal fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Users for connect page
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, age, gender, bio, join_date FROM users WHERE id != $1 AND profile_complete = true",
      [req.user.userId],
    )

    res.json(result.rows)
  } catch (error) {
    console.error("Users fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Friend requests
app.post("/api/friends/request", authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body

    // Check if request already exists
    const existing = await pool.query("SELECT * FROM friend_requests WHERE requester_id = $1 AND requested_id = $2", [
      req.user.userId,
      friendId,
    ])

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Friend request already sent" })
    }

    const result = await pool.query(
      "INSERT INTO friend_requests (requester_id, requested_id) VALUES ($1, $2) RETURNING *",
      [req.user.userId, friendId],
    )

    res.json(result.rows[0])
  } catch (error) {
    console.error("Friend request error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

app.get("/api/friends/requests", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT requested_id FROM friend_requests WHERE requester_id = $1", [
      req.user.userId,
    ])

    res.json(result.rows.map((row) => row.requested_id))
  } catch (error) {
    console.error("Friend requests fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Stats endpoint
app.get("/api/stats", authenticateToken, async (req, res) => {
  try {
    const [journalCount, moodCount, gratitudeCount] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM journal_entries WHERE user_id = $1", [req.user.userId]),
      pool.query("SELECT COUNT(*) FROM moods WHERE user_id = $1", [req.user.userId]),
      pool.query("SELECT COUNT(*) FROM gratitudes WHERE user_id = $1", [req.user.userId]),
    ])

    // Calculate days active
    const userResult = await pool.query("SELECT join_date FROM users WHERE id = $1", [req.user.userId])
    const joinDate = new Date(userResult.rows[0].join_date)
    const today = new Date()
    const daysActive = Math.floor((today - joinDate) / (1000 * 60 * 60 * 24)) + 1

    res.json({
      journalCount: Number.parseInt(journalCount.rows[0].count),
      moodCount: Number.parseInt(moodCount.rows[0].count),
      gratitudeCount: Number.parseInt(gratitudeCount.rows[0].count),
      daysActive,
    })
  } catch (error) {
    console.error("Stats fetch error:", error)
    res.status(500).json({ error: "Server error" })
  }
})

// Serve frontend files
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"))
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: "Something went wrong!" })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
