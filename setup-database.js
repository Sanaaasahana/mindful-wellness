const { Pool } = require("pg")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
})

async function setupDatabase() {
  try {
    console.log("Setting up database...")

    const schemaSQL = fs.readFileSync(path.join(__dirname, "database", "schema.sql"), "utf8")
    await pool.query(schemaSQL)

    console.log("Database setup completed successfully!")
    process.exit(0)
  } catch (error) {
    console.error("Database setup failed:", error)
    process.exit(1)
  }
}

setupDatabase()
