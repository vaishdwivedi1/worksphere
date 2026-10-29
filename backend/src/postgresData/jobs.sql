-- ============================================
-- TABLE 6: JOBS - Job Postings
-- ============================================
-- Kya hai: Yeh table store karti hai saari job openings ko
-- Important: Har job kisi organization se linked hai
-- ============================================

CREATE TABLE jobs (
    -- Primary key - Har job ka unique ID
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEY: Kaunsi organization ne job post kiya?
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- FOREIGN KEY: Kis member ne job create kiya? (Requester)
    created_by UUID REFERENCES organization_members(id) ON DELETE SET NULL,
    
    -- Basic Information
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    team VARCHAR(100),
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-time',
    experience_required VARCHAR(100),
    location VARCHAR(255),
    
    -- Description & Details
    description TEXT,
    requirements TEXT[], -- Array of strings
    skills TEXT[],       -- Array of strings
    
    -- Workflow & Screening
    -- JSONB use kar rahe hain taaki flexible structure rahe (rounds array, questions array)
    hiring_workflow JSONB DEFAULT '[]'::jsonb, -- Example: [{"name": "HR", "interviewer": "John", "type": "Phone", "duration": "30 mins"}]
    screening_questions TEXT[], -- Array of strings
    
    -- Approval Details
    approval_requested_by VARCHAR(255),
    approval_reason TEXT,
    approval_department VARCHAR(100),
    approval_team VARCHAR(100),
    
    -- Status Management
    -- Status: Draft, Open, Closed, On Hold, Filled
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    
    -- Metrics (Cached for performance, can be updated via triggers)
    total_applicants INTEGER DEFAULT 0,
    total_rounds INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_job_status CHECK (status IN ('Draft', 'Open', 'Closed', 'On Hold', 'Filled')),
    CONSTRAINT valid_employment_type CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Internship'))
);

-- ============================================
-- PERFORMANCE INDEXES FOR JOBS
-- ============================================

-- Organization filter ke liye (most important)
CREATE INDEX idx_jobs_organization_id ON jobs (organization_id);

-- Status exact match ke liye (e.g., filter = 'Open')
CREATE INDEX idx_jobs_status ON jobs (status);

-- Department filter ke liye
CREATE INDEX idx_jobs_department ON jobs (department);

-- Sorting by created_at (newest first)
CREATE INDEX idx_jobs_created_at ON jobs (created_at DESC);

-- Composite Index: Organization + Status (common query: "show all open jobs of this org")
CREATE INDEX idx_jobs_org_status ON jobs (organization_id, status);

-- Full-text search on title (using trigram for fuzzy search)
CREATE INDEX idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);

-- ============================================
-- TRIGGER: Auto-update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_jobs_updated_at
BEFORE UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION update_jobs_updated_at();


-- ============================================
-- TABLE 7: CANDIDATES - Job ke saare applicants
-- ============================================
-- Kya hai: Yeh table store karti hai un sabhi logon ko jinhone kisi job ke liye apply kiya hai.
-- Important: Ek job ke multiple candidates ho sakte hain.
-- ============================================

CREATE TABLE candidates (
    -- Primary key - Har candidate ka unique ID
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEY: Kis job ke liye apply kiya hai?
    -- Agar job delete ho gayi toh candidates bhi delete ho jayenge
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    
    -- FOREIGN KEY: Kis organization ka part hai? (Fast filtering ke liye)
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    
    -- Resume & Experience
    resume_url TEXT, -- File path ya URL
    experience VARCHAR(100), -- e.g., "6 years"
    notice_period VARCHAR(100), -- e.g., "2 weeks"
    
    -- Candidate Status Lifecycle
    -- Applied -> Screening -> Interviewing -> Selected/Rejected -> Offered -> Joined
    status VARCHAR(50) NOT NULL DEFAULT 'Applied',
    
    -- Current Stage (Optional, agar aap stage tracking alag se rakhna chahte hain)
    stage VARCHAR(100), 
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_candidate_status CHECK (
        status IN ('Applied', 'Screening', 'Interviewing', 'Selected', 'Rejected', 'Offered', 'Joined')
    ),
    -- Ek job ke liye ek email se ek hi baar apply ho sakta hai
    CONSTRAINT unique_job_candidate UNIQUE (job_id, email)
);

-- ============================================
-- TABLE 8: CANDIDATE_INTERVIEWS - Interview History
-- ============================================
-- Kya hai: Yeh table store karti hai har candidate ke har interview round ka feedback aur result.
-- Important: Ek candidate ke multiple interview rounds ho sakte hain.
-- ============================================

CREATE TABLE candidate_interviews (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEY: Kis candidate ka interview hai?
    candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
    
    -- Interview Details
    round_name VARCHAR(255) NOT NULL, -- e.g., "HR Screening", "Technical Round"
    interviewer VARCHAR(255), -- Interviewer ka naam
    interview_type VARCHAR(50), -- e.g., "Phone", "Video", "In-person"
    duration VARCHAR(50), -- e.g., "30 mins", "60 mins"
    
    -- Feedback & Result
    feedback TEXT,
    result VARCHAR(50), -- e.g., "Passed", "Failed", "On Hold"
    score INTEGER, -- e.g., 85 (0-100)
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_interview_result CHECK (
        result IN ('Passed', 'Failed', 'On Hold', 'Pending')
    ),
    CONSTRAINT valid_score_range CHECK (score >= 0 AND score <= 100)
);

-- ============================================
-- PERFORMANCE INDEXES
-- ============================================

-- Candidates Table Indexes
-- Job ke hisaab se candidates filter karne ke liye
CREATE INDEX idx_candidates_job_id ON candidates (job_id);
-- Organization ke hisaab se filter karne ke liye
CREATE INDEX idx_candidates_org_id ON candidates (organization_id);
-- Status ke hisaab se filter (e.g., "Show all Selected candidates")
CREATE INDEX idx_candidates_status ON candidates (status);
-- Email search ke liye
CREATE INDEX idx_candidates_email ON candidates (email);
-- Sorting by newest first
CREATE INDEX idx_candidates_created_at ON candidates (created_at DESC);

-- Composite Index: Job + Status (Common query: "Is job ke kitne Selected hain?")
CREATE INDEX idx_candidates_job_status ON candidates (job_id, status);

-- Candidate Interviews Table Indexes
-- Candidate ke saare interviews fetch karne ke liye
CREATE INDEX idx_candidate_interviews_candidate_id ON candidate_interviews (candidate_id);
-- Result ke hisaab se filter karne ke liye
CREATE INDEX idx_candidate_interviews_result ON candidate_interviews (result);

-- ============================================
-- TRIGGERS: Auto-update updated_at timestamp
-- ============================================

-- Candidates Trigger
CREATE OR REPLACE FUNCTION update_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidates_updated_at
BEFORE UPDATE ON candidates
FOR EACH ROW
EXECUTE FUNCTION update_candidates_updated_at();

-- Candidate Interviews Trigger
CREATE OR REPLACE FUNCTION update_candidate_interviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_candidate_interviews_updated_at
BEFORE UPDATE ON candidate_interviews
FOR EACH ROW
EXECUTE FUNCTION update_candidate_interviews_updated_at();