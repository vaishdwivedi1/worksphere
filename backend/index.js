import express from "express";
import dotenv from "dotenv";

import connectMongoDB from "./src/config/mongodb.js";
import pool from "./src/config/postgres.js";

import authRoutes from "./src/routes/authRoutes.js";
import memberRoutes from "./src/routes/memberRoutes.js";
import { createTables } from "./src/postgresDatabase.js/database.js";
import { resetDatabase } from "./src/commonFunctions/reset-database.js";
import cors from "cors";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// routes
app.use("/worksphere/api/", authRoutes);
app.use("/worksphere/api/", memberRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "WorkSphere API is running",
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");

    // create tables
    // resetDatabase();

    createTables();

    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
  }
};

async function enablePgTrgm() {
  try {
    console.log("🔧 Enabling pg_trgm extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    console.log("✅ pg_trgm extension enabled successfully!");

    // Verify
    const result = await pool.query(
      "SELECT * FROM pg_extension WHERE extname = 'pg_trgm'",
    );
    if (result.rows.length > 0) {
      console.log("✅ pg_trgm is installed and active");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error enabling pg_trgm:", error.message);
    process.exit(1);
  }
}

// enablePgTrgm();

startServer();
