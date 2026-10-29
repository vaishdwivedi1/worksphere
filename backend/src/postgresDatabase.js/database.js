import pool from "../config/postgres.js";

export const createTables = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // 1. organizations
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255) NOT NULL,
        owner_email VARCHAR(255) NOT NULL UNIQUE,
        owner_phone VARCHAR(255) NOT NULL,
        company_email VARCHAR(255) NOT NULL UNIQUE,
        company_logo TEXT,
        plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_plan CHECK (plan IN ('FREE', 'PRO', 'PREMIUM'))
      );
    `);

    // 2. users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        phone VARCHAR(20),
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        profile_picture TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. organization_members
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

    // 4. jobs (screening_questions is now JSONB)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        created_by UUID REFERENCES organization_members(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        department VARCHAR(100),
        team VARCHAR(100),
        employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-time',
        experience_required VARCHAR(100),
        location VARCHAR(255),
        description TEXT,
        responsibilities TEXT,
        requirements TEXT[],
        skills TEXT[],
        hiring_workflow JSONB DEFAULT '[]'::jsonb,
        screening_questions JSONB DEFAULT '[]'::jsonb,
        approval_requested_by VARCHAR(255),
        approval_reason TEXT,
        approval_department VARCHAR(100),
        approval_team VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Draft',
        total_applicants INTEGER DEFAULT 0,
        total_rounds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_job_status CHECK (status IN ('Draft', 'Open', 'Closed', 'On Hold', 'Filled')),
        CONSTRAINT valid_employment_type CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship'))
      );
    `);

    // ✅ SAFETY: Add responsibilities if missing
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'responsibilities') THEN 
          ALTER TABLE jobs ADD COLUMN responsibilities TEXT; 
        END IF; 
      END $$;
    `);

    // ✅ SAFETY: Convert TEXT[] screening_questions to JSONB (from old schema)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (
          SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'jobs' 
            AND COLUMN_NAME = 'screening_questions' 
            AND DATA_TYPE = 'ARRAY'
        ) THEN 
          ALTER TABLE jobs ALTER COLUMN screening_questions DROP DEFAULT;
          ALTER TABLE jobs ALTER COLUMN screening_questions TYPE JSONB 
            USING CASE 
              WHEN screening_questions IS NULL THEN '[]'::jsonb
              ELSE to_jsonb(screening_questions)
            END;
          ALTER TABLE jobs ALTER COLUMN screening_questions SET DEFAULT '[]'::jsonb;
        END IF; 
      END $$;
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_organization_id ON jobs (organization_id);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs (status);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_department ON jobs (department);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs (created_at DESC);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_org_status ON jobs (organization_id, status);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);`,
    );

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_jobs_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`DROP TRIGGER IF EXISTS trg_jobs_updated_at ON jobs;`);
    await pool.query(`
      CREATE TRIGGER trg_jobs_updated_at
      BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_jobs_updated_at();
    `);

    // 5. candidates (has screening_answers JSONB)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        resume_url TEXT,
        experience VARCHAR(100),
        notice_period VARCHAR(100),
        status VARCHAR(50) NOT NULL DEFAULT 'Applied',
        stage VARCHAR(100),
        screening_answers JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_candidate_status CHECK (status IN ('Applied','Screening','Interviewing','Selected','Rejected','Offered','Joined')),
        CONSTRAINT unique_job_candidate UNIQUE (job_id, email)
      );
    `);

    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'candidates' AND COLUMN_NAME = 'screening_answers') THEN 
          ALTER TABLE candidates ADD COLUMN screening_answers JSONB DEFAULT '{}'::jsonb; 
        END IF; 
      END $$;
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_job_id ON candidates (job_id);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_org_id ON candidates (organization_id);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates (status);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates (email);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates (created_at DESC);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidates_job_status ON candidates (job_id, status);`,
    );

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_candidates_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(
      `DROP TRIGGER IF EXISTS trg_candidates_updated_at ON candidates;`,
    );
    await pool.query(`
      CREATE TRIGGER trg_candidates_updated_at
      BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_candidates_updated_at();
    `);

    // 6. candidate_interviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_interviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        round_name VARCHAR(255) NOT NULL,
        interviewer VARCHAR(255),
        interview_type VARCHAR(50),
        duration VARCHAR(50),
        feedback TEXT,
        result VARCHAR(50),
        score INTEGER,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_interview_result CHECK (result IN ('Passed','Failed','On Hold','Pending')),
        CONSTRAINT valid_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 100))
      );
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidate_interviews_candidate_id ON candidate_interviews (candidate_id);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidate_interviews_result ON candidate_interviews (result);`,
    );

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_candidate_interviews_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(
      `DROP TRIGGER IF EXISTS trg_candidate_interviews_updated_at ON candidate_interviews;`,
    );
    await pool.query(`
      CREATE TRIGGER trg_candidate_interviews_updated_at
      BEFORE UPDATE ON candidate_interviews FOR EACH ROW EXECUTE FUNCTION update_candidate_interviews_updated_at();
    `);

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }
};
