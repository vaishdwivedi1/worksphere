-- ============================================
-- DATABASE SCHEMA - USERS, ORGANIZATIONS, AND MEMBERS
-- ============================================
-- Yeh file database ki structure create karti hai
-- Isme 3 tables hain: users, organizations, organization_members
-- ============================================

-- ============================================
-- TABLE 1: USERS - Sabhi users ki information
-- ============================================
-- Kya hai: Yeh table store karta hai application ke sabhi users ko
-- Important: Har user unique email se identify hota hai
-- ============================================

CREATE TABLE users (
    -- Primary key - Har user ka unique ID (automatically generate hota hai)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User ka email address (UNIQUE - do log ka same email nahi ho sakta)
    email VARCHAR(255) NOT NULL UNIQUE,
    
    -- User ka phone number (optional - ho sakta hai nahi bhi ho)
    phone VARCHAR(20),
    -- phone VARCHAR(20) UNIQUE,  -- Agar phone unique chahiye toh uncomment karo
    
    -- User ka full name (compulsory - nahi ho sakta empty)
    name VARCHAR(255) NOT NULL,
    
    -- Encrypted password (hash form mein store hota hai, plain text nahi)
    password_hash VARCHAR(255) NOT NULL,
    
    -- Profile picture ka URL ya path (optional)
    profile_picture TEXT,
    
    -- Kya user active hai? (default: true - active)
    is_active BOOLEAN DEFAULT TRUE,

    -- User ka role (default: user)
    role VARCHAR(50) DEFAULT 'user',
    
    -- Kab user create hua? (auto-filled with current timestamp)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Kab last update hua? (auto-filled with current timestamp)
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints: Role sirf specified values mein se ho sakta hai
    CONSTRAINT valid_user_role CHECK (role IN ('owner', 'admin', 'hr', 'developer', 'sales', 'marketing', 'user'))
);


-- ============================================
-- TABLE 2: ORGANIZATIONS - Companies/Organizations ki information
-- ============================================
-- Kya hai: Yeh table store karti hai sabhi organizations/companies ko
-- Important: Har organization ka unique owner_email aur owner_phone hota hai
-- ============================================

CREATE TABLE organizations (
    -- Primary key - Har organization ka unique ID
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Company ka official name
    company_name VARCHAR(255) NOT NULL,
    
    -- Owner ka naam (jo organization banaya hai)
    owner_name VARCHAR(255) NOT NULL,
    
    -- Owner ka email (UNIQUE - ek email se ek hi organization)
    owner_email VARCHAR(255) NOT NULL UNIQUE,
    
    -- Owner ka phone (UNIQUE - ek phone se ek hi organization)
    owner_phone VARCHAR(20) NOT NULL UNIQUE,
    
    -- Company ka official email address
    company_email VARCHAR(255) NOT NULL,
    
    -- Company logo ka URL (optional)
    company_logo TEXT,
    
    -- Plan type: FREE, PRO, ya PREMIUM (default: FREE)
    plan VARCHAR(20) NOT NULL DEFAULT 'FREE',
    
    -- Timestamps for tracking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint: Plan sirf inhi 3 values mein se ho sakta hai
    CONSTRAINT valid_plan CHECK (plan IN ('FREE', 'PRO', 'PREMIUM'))
);


-- ============================================
-- TABLE 3: ORGANIZATION_MEMBERS - Organization ke members
-- ============================================
-- Kya hai: Yeh table connect karti hai users ko organizations se
-- Important: Ek user multiple organizations mein ho sakta hai (different roles ke saath)
-- ============================================

CREATE TABLE organization_members (
    -- Primary key - Har membership ka unique ID
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- FOREIGN KEY: Kaunsi organization mein member hai?
    -- REFERENCES organizations(id) - Agar organization delete ho toh members bhi delete ho jayein
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- FOREIGN KEY: Kaunsi user hai yeh member?
    -- REFERENCES users(id) - Agar user delete ho toh member entry mein user_id NULL ho jaye
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Member ka email (organization ke andar unique hona chahiye)
    email VARCHAR(255) NOT NULL,
    
    -- Role: owner, admin, hr, developer, sales, marketing (default: developer)
    role VARCHAR(50) NOT NULL DEFAULT 'developer',
    
    -- Status: pending, active, inactive, suspended (default: pending)
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Department (optional - NULL ho sakta hai)
    department VARCHAR(50),
    
    -- Kaunsi user ne invite kiya? (agar kisi ne invite kiya ho)
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps for tracking
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints: Role sirf specified values mein se ho sakta hai
    CONSTRAINT valid_member_role CHECK (role IN ('owner', 'admin', 'hr', 'developer', 'sales', 'marketing')),
    
    -- Constraints: Status sirf specified values mein se ho sakta hai
    CONSTRAINT valid_status CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
    
    -- Unique constraint: Ek organization mein ek email se ek hi member ho sakta hai
    CONSTRAINT unique_org_member UNIQUE (organization_id, email)
);


-- ============================================
-- PERFORMANCE INDEXES - Database ko fast banane ke liye
-- ============================================
-- Yeh indexes queries ko 10x faster kar dete hain
-- Inhe ek baar create karna hota hai, baad mein automatically use hote hain
-- ============================================

-- ============================================
-- STEP 1: Enable pg_trgm extension for fuzzy search
-- ============================================
-- Kya hai: pg_trgm PostgreSQL ka extension hai jo "fuzzy search" (typo-tolerant search) allow karta hai
-- Kaise kaam karta hai: Words ko 3-character chunks (trigrams) mein tod deta hai
-- Example: "John" -> "Joh", "ohn" (3-3 characters ke groups)
-- Use: Jab user "Jhon" type kare toh "John" bhi mil jaye
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- ============================================
-- STEP 2: Trigram Indexes for Fuzzy Search
-- ============================================
-- Kya hai: Yeh indexes GIN (Generalized Inverted Index) use karte hain
-- Kaise kaam karta hai: Har column ke text ko trigrams mein todkar index banata hai
-- Benefit: Search queries 10x faster ho jati hain
-- Use: Jab user name, email, phone, ya role search kare
-- ============================================

-- Index for searching users by name (most common search)
-- Example: "SELECT * FROM users WHERE name % 'John'"
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);

-- Index for searching members by email
-- Example: "SELECT * FROM organization_members WHERE email % 'example.com'"
CREATE INDEX idx_om_email_trgm ON organization_members USING gin (email gin_trgm_ops);

-- Index for searching users by phone
-- Example: "SELECT * FROM users WHERE phone % '1234567890'"
CREATE INDEX idx_users_phone_trgm ON users USING gin (phone gin_trgm_ops);

-- Index for searching members by role
-- Example: "SELECT * FROM organization_members WHERE role % 'devloper'"
CREATE INDEX idx_om_role_trgm ON organization_members USING gin (role gin_trgm_ops);


-- ============================================
-- STEP 3: B-tree Indexes for Exact Matches and Sorting
-- ============================================
-- Kya hai: B-tree index exact matches ke liye best hai
-- Kaise kaam karta hai: Data ko sorted tree structure mein store karta hai
-- Benefit: WHERE clauses, JOINs, ORDER BY queries fast ho jati hain
-- Use: Jab exact match filter lage (role = 'admin', status = 'active', etc.)
-- ============================================

-- Organization ID filter ke liye (most important - almost har query mein use hota hai)
CREATE INDEX idx_om_organization_id ON organization_members (organization_id);

-- User ID JOIN ke liye (fast JOIN operations)
CREATE INDEX idx_om_user_id ON organization_members (user_id);

-- Role exact match ke liye (jab filter = 'admin' ho)
CREATE INDEX idx_om_role ON organization_members (role);

-- Status exact match ke liye (jab filter = 'active' ho)
CREATE INDEX idx_om_status ON organization_members (status);

-- Sorting by created_at (newest first) ke liye
-- DESC ka matlab hai latest records pehle aayein
CREATE INDEX idx_om_created_at ON organization_members (created_at DESC);


-- ============================================
-- STEP 4: Composite Indexes for Common Query Patterns
-- ============================================
-- Kya hai: Composite index = Multiple columns par ek saath index
-- Kaise kaam karta hai: WHERE clause mein multiple conditions use ho toh fast
-- Benefit: 2-3 filters ek saath use karne par query fast ho jati hai
-- Use: Jab organization_id + status, organization_id + role, etc.
-- ============================================

-- Organization + Status combo (common: "show all active members of this org")
CREATE INDEX idx_om_org_status ON organization_members (organization_id, status);

-- Organization + Role combo (common: "show all admin members of this org")
CREATE INDEX idx_om_org_role ON organization_members (organization_id, role);

-- Organization + Created_at combo (common: "show newest members of this org")
CREATE INDEX idx_om_org_created ON organization_members (organization_id, created_at DESC);


-- ============================================
-- STEP 5: Partial Indexes for Most Common Filters
-- ============================================
-- Kya hai: Partial index = Sirf specific condition wali rows par index
-- Kaise kaam karta hai: WHERE clause ke saath index create karo
-- Benefit: Index chhota hota hai (sirf relevant rows store hoti hain), memory less use hoti hai
-- Use: Jab specific status ya role ki queries bohot zyada aati hain
-- ============================================

-- Sirf ACTIVE members ke liye index (kyunki most queries active members hi show karti hain)
CREATE INDEX idx_om_active ON organization_members (organization_id) WHERE status = 'active';

-- Sirf ADMIN members ke liye index (admin-specific queries fast karne ke liye)
CREATE INDEX idx_om_admin ON organization_members (organization_id) WHERE role = 'admin';

-- ============================================
-- STEP 6: Department Index
-- ============================================
-- Kya hai: Department column par index
-- Why: Department-wise filtering fast karne ke liye
-- ============================================

CREATE INDEX idx_om_department ON organization_members (department);

-- ============================================
-- BONUS: Check kaunsa index use ho raha hai
-- ============================================
-- Query ke saamne EXPLAIN ANALYZE laga kar dekho:
-- Example: EXPLAIN ANALYZE SELECT * FROM organization_members WHERE organization_id = '...' AND status = 'active';
-- Isse pata chalega kaunsa index use hua aur kitna fast tha
-- ============================================

-- ============================================
-- SUMMARY: Kis query mein kaunsa index use hoga?
-- ============================================
-- 1. Search by name:        idx_users_name_trgm
-- 2. Search by email:       idx_om_email_trgm
-- 3. Search by phone:       idx_users_phone_trgm
-- 4. Search by role:        idx_om_role_trgm (fuzzy) or idx_om_role (exact)
-- 5. Filter by status:      idx_om_status
-- 6. Filter by org + status: idx_om_org_status
-- 7. Filter by org + role:  idx_om_org_role
-- 8. Sort by created_at:    idx_om_created_at
-- 9. Show active members:   idx_om_active (partial index - fastest!)
-- 10. Show admin members:   idx_om_admin (partial index - fastest!)
-- 11. Filter by department: idx_om_department
-- ============================================