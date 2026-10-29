import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import connectMongoDB from "./src/config/mongodb.js";
import pool from "./src/config/postgres.js";

import authRoutes from "./src/routes/authRoutes.js";
import memberRoutes from "./src/routes/memberRoutes.js";
import teamRoutes from "./src/routes/teamRoutes.js";
import jobRoutes from "./src/routes/jobRoutes.js";
import candidateRoutes from "./src/routes/candidateRoutes.js";
import interviewRoutes from "./src/routes/interviewRoutes.js";
import { resetDatabase } from "./src/commonFunctions/reset-database.js";
import { createTables } from "./src/postgresDatabase.js/database.js";

dotenv.config();

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

// ============================================
// ROUTES — all under /worksphere/api
// Each router internally adds /v1/<resource>
// ============================================
app.use("/worksphere/api", authRoutes);
app.use("/worksphere/api", memberRoutes);
app.use("/worksphere/api", teamRoutes);
app.use("/worksphere/api", jobRoutes);
app.use("/worksphere/api", candidateRoutes);
app.use("/worksphere/api", interviewRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "WorkSphere API is running" });
});

// 404 handler — MUST be last, after all routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("PostgreSQL connected");

    await createTables();
    // resetDatabase();
    await connectMongoDB();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
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
