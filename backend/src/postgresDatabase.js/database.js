import pool from "../config/postgres.js";

export const createTables = async () => {
  try {
    // 1. Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        owner_email VARCHAR(255) NOT NULL UNIQUE,
        owner_phone VARCHAR(255) NOT NULL ,
        company_email VARCHAR(255) NOT NULL UNIQUE,
        company_logo TEXT,
        plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_plan CHECK (plan IN ('FREE', 'PRO', 'PREMIUM'))
      );
    `);

    // 2. Create users table (FIXED: correct table name)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20) ,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_picture TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create organization_members table (FIXED: correct table name)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organization_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'developer',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'hr', 'developer', 'sales', 'marketing')),
        CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
        CONSTRAINT unique_org_member UNIQUE (organization_id, email)
      );
    `);

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }
};
