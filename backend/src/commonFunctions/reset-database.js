import pool from "../config/postgres.js";

export const resetDatabase = async () => {
  try {


    // Drop child tables first
    await pool.query(`DROP TABLE IF EXISTS organization_members CASCADE;`);

    await pool.query(`DROP TABLE IF EXISTS users CASCADE;`);

    await pool.query(`DROP TABLE IF EXISTS organizations CASCADE;`);

    // Drop migrations table if exists
    await pool.query(`DROP TABLE IF EXISTS migrations CASCADE;`);

    console.log("Database reset complete!");
  } catch (error) {
    console.error("Error resetting database:", error.message);
    throw error;
  }
};
