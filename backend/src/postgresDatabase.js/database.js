import pool from "../config/postgres.js";

export const createTables = async () => {
  try {
    await pool.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // ============================================
    // 1. organizations
    // ============================================
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

    // ============================================
    // 2. users
    // ============================================
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

    // ============================================
    // 3. organization_members
    // ============================================
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

    // ============================================
    // 4. jobs
    // ============================================
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

    // Safety migrations for jobs
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'responsibilities') THEN 
          ALTER TABLE jobs ADD COLUMN responsibilities TEXT; 
        END IF; 
      END $$;
    `);

    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'jobs' AND COLUMN_NAME = 'screening_questions' AND DATA_TYPE = 'ARRAY') THEN 
          ALTER TABLE jobs ALTER COLUMN screening_questions DROP DEFAULT;
          ALTER TABLE jobs ALTER COLUMN screening_questions TYPE JSONB USING CASE WHEN screening_questions IS NULL THEN '[]'::jsonb ELSE to_jsonb(screening_questions) END;
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
      `CREATE INDEX IF NOT EXISTS idx_jobs_team ON jobs (team);`,
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

    // ============================================
    // 5. candidates (expanded)
    // ============================================
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
        salary_expectation VARCHAR(100),
        linkedin_url TEXT,
        portfolio_url TEXT,
        github_url TEXT,
        current_company VARCHAR(255),
        current_designation VARCHAR(255),
        hr_call_notes TEXT,
        hr_call_status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_candidate_status CHECK (status IN ('Applied','Screening','Interviewing','Selected','Rejected','Offered','Joined')),
        CONSTRAINT valid_hr_call_status CHECK (hr_call_status IN ('Pending','Passed','Failed','On Hold')),
        CONSTRAINT unique_job_candidate UNIQUE (job_id, email)
      );
    `);

    // Safety migrations for candidates — add new columns if missing
    const candidateAlters = [
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS screening_answers JSONB DEFAULT '{}'::jsonb;`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS salary_expectation VARCHAR(100);`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS portfolio_url TEXT;`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS github_url TEXT;`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_company VARCHAR(255);`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_designation VARCHAR(255);`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS hr_call_notes TEXT;`,
      `ALTER TABLE candidates ADD COLUMN IF NOT EXISTS hr_call_status VARCHAR(50) DEFAULT 'Pending';`,
    ];
    for (const sql of candidateAlters) {
      try {
        await pool.query(sql);
      } catch (e) {
        /* ignore */
      }
    }

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

    // ============================================
    // 6. candidate_interviews (legacy — kept for compat)
    // ============================================
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

    // ============================================
    // 7. candidate_rounds (new — HR call, screening, technical etc.)
    // ============================================
    await pool.query(`
      CREATE TABLE IF NOT EXISTS candidate_rounds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
        round_number INTEGER NOT NULL DEFAULT 1,
        round_name VARCHAR(255) NOT NULL,
        round_type VARCHAR(50) DEFAULT 'Interview',
        interviewer VARCHAR(255),
        status VARCHAR(50) NOT NULL DEFAULT 'Pending',
        questions_asked JSONB DEFAULT '[]'::jsonb,
        overall_feedback TEXT,
        overall_score INTEGER,
        scheduled_at TIMESTAMP,
        conducted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT valid_round_status CHECK (status IN ('Pending','Scheduled','Passed','Failed','On Hold')),
        CONSTRAINT valid_round_score CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 100))
      );
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidate_rounds_candidate_id ON candidate_rounds (candidate_id);`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_candidate_rounds_status ON candidate_rounds (status);`,
    );

    await pool.query(`
      CREATE OR REPLACE FUNCTION update_candidate_rounds_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(
      `DROP TRIGGER IF EXISTS trg_candidate_rounds_updated_at ON candidate_rounds;`,
    );
    await pool.query(`
      CREATE TRIGGER trg_candidate_rounds_updated_at
      BEFORE UPDATE ON candidate_rounds FOR EACH ROW EXECUTE FUNCTION update_candidate_rounds_updated_at();
    `);

    console.log("All tables created successfully!");
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }

  // ============================================
  // 8. leave_types
  // ============================================
  await pool.query(`
  CREATE TABLE IF NOT EXISTS leave_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_days_per_year INTEGER NOT NULL DEFAULT 0,
    carry_forward_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_org_leave_type UNIQUE (organization_id, name)
  );
`);

  await pool.query(`
  CREATE INDEX IF NOT EXISTS idx_leave_types_org_id ON leave_types (organization_id);
`);

  await pool.query(`
  CREATE OR REPLACE FUNCTION update_leave_types_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;
`);
  await pool.query(
    `DROP TRIGGER IF EXISTS trg_leave_types_updated_at ON leave_types;`,
  );
  await pool.query(`
  CREATE TRIGGER trg_leave_types_updated_at
  BEFORE UPDATE ON leave_types FOR EACH ROW EXECUTE FUNCTION update_leave_types_updated_at();
`);

  // ============================================
  // 9. leaves
  // ============================================
  await pool.query(`
  CREATE TABLE IF NOT EXISTS leaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    leave_type_id UUID NOT NULL REFERENCES leave_types(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    number_of_days NUMERIC(5,2) NOT NULL DEFAULT 0,
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,
    half_day_session VARCHAR(10),
    is_wfh BOOLEAN NOT NULL DEFAULT FALSE,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending',
    applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    rejected_by UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    actioned_at TIMESTAMP,
    approval_comment TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_leave_status CHECK (status IN ('Pending','Approved','Rejected','Cancelled')),
    CONSTRAINT valid_half_day_session CHECK (half_day_session IS NULL OR half_day_session IN ('AM','PM')),
    CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
  );
`);

  const leaveAlters = [
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS is_half_day BOOLEAN NOT NULL DEFAULT FALSE;`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS half_day_session VARCHAR(10);`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS is_wfh BOOLEAN NOT NULL DEFAULT FALSE;`,
    `ALTER TABLE leaves ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;`,
  ];
  for (const sql of leaveAlters) {
    try {
      await pool.query(sql);
    } catch (e) {
      /* ignore */
    }
  }

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_org_id ON leaves (organization_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_employee_id ON leaves (employee_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_leave_type_id ON leaves (leave_type_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_status ON leaves (status);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_dates ON leaves (start_date, end_date);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_applied_date ON leaves (applied_date DESC);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_leaves_org_status ON leaves (organization_id, status);`,
  );

  await pool.query(`
  CREATE OR REPLACE FUNCTION update_leaves_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;
`);
  await pool.query(`DROP TRIGGER IF EXISTS trg_leaves_updated_at ON leaves;`);
  await pool.query(`
  CREATE TRIGGER trg_leaves_updated_at
  BEFORE UPDATE ON leaves FOR EACH ROW EXECUTE FUNCTION update_leaves_updated_at();
`);

  // ============================================
  // 10. requests
  // ============================================
  await pool.query(`
  CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'General',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    attachments JSONB DEFAULT '[]'::jsonb,
    resolution TEXT,
    resolved_by UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_request_category CHECK (category IN ('Leave','Payroll','Documents','Equipment','Policy','IT Support','General')),
    CONSTRAINT valid_request_status CHECK (status IN ('Open','Pending','In Review','Resolved','Rejected','Closed')),
    CONSTRAINT valid_request_priority CHECK (priority IN ('Low','Medium','High','Urgent'))
  );
`);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_org_id ON requests (organization_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_created_by ON requests (created_by);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_assigned_to ON requests (assigned_to);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_status ON requests (status);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_category ON requests (category);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests (created_at DESC);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_requests_org_status ON requests (organization_id, status);`,
  );

  await pool.query(`
  CREATE OR REPLACE FUNCTION update_requests_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;
`);
  await pool.query(
    `DROP TRIGGER IF EXISTS trg_requests_updated_at ON requests;`,
  );
  await pool.query(`
  CREATE TRIGGER trg_requests_updated_at
  BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION update_requests_updated_at();
`);

  // ============================================
  // 11. request_comments
  // ============================================
  await pool.query(`
  CREATE TABLE IF NOT EXISTS request_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_request_comments_request_id ON request_comments (request_id);`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_request_comments_created_at ON request_comments (created_at ASC);`,
  );

  await pool.query(`
  CREATE OR REPLACE FUNCTION update_request_comments_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
  $$ LANGUAGE plpgsql;
`);
  await pool.query(
    `DROP TRIGGER IF EXISTS trg_request_comments_updated_at ON request_comments;`,
  );
  await pool.query(`
  CREATE TRIGGER trg_request_comments_updated_at
  BEFORE UPDATE ON request_comments FOR EACH ROW EXECUTE FUNCTION update_request_comments_updated_at();
`);

  // ============================================
  // 12. announcements
  // ============================================
  await pool.query(`
    CREATE TABLE IF NOT EXISTS announcements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_by UUID NOT NULL REFERENCES organization_members(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'General',
      recipient_type VARCHAR(50) NOT NULL DEFAULT 'Entire Organization',
      target_department VARCHAR(100),
      target_team_id UUID, -- Assuming a teams table exists, we just store the ID or name
      target_member_ids JSONB DEFAULT '[]'::jsonb,
      status VARCHAR(50) NOT NULL DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT valid_announcement_type CHECK (type IN ('General', 'HR', 'Holiday', 'Policy Update', 'Event', 'Emergency')),
      CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('Entire Organization', 'Department', 'Team', 'Individual Employees')),
      CONSTRAINT valid_announcement_status CHECK (status IN ('Active', 'Archived'))
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_announcements_org_id ON announcements (organization_id);
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements (status);
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION update_announcements_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
    $$ LANGUAGE plpgsql;
  `);
  await pool.query(
    `DROP TRIGGER IF EXISTS trg_announcements_updated_at ON announcements;`,
  );
  await pool.query(`
    CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();
  `);
};
