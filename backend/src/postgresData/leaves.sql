-- ============================================
-- DATABASE SCHEMA - LEAVES MODULE
-- ============================================
-- Yeh file leaves module ki structure create karti hai
-- Isme 3 tables hain:
--   1. leave_types  - Organization ke leave categories (Annual, Sick, etc.)
--   2. leaves       - Actual leave requests (apply / approve / reject / cancel)
--   3. leave_attachments - Leave ke saath uploaded documents (optional)
-- Plus: indexes, triggers, aur helper functions
-- ============================================


-- ============================================
-- TABLE 1: LEAVE_TYPES - Organization ki leave categories
-- ============================================
-- Kya hai: Har organization apni leave categories define karti hai
--   Example: "Annual Leave" (20 days), "Sick Leave" (10 days), "Casual Leave"
-- Important:
--   - Har leave type kisi ek organization ka hota hai (organization_id)
--   - name us org ke andar unique hona chahiye
--   - is_paid = TRUE  -> paid leave (salary cut nahi)
--   - is_paid = FALSE -> unpaid leave
--   - requires_approval = TRUE -> approve/reject flow chahiye
--   - requires_approval = FALSE -> auto-approve (e.g. WFH / optional)
-- ============================================

CREATE TABLE leave_types (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kis organization ka leave type hai?
    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    -- Leave type ka naam (e.g. "Annual Leave", "Sick Leave")
    name VARCHAR(100) NOT NULL,

    -- Optional description
    description TEXT,

    -- Ek saal mein maximum kitne din is type ke liye mil sakte hain
    -- 0 ka matlab "no fixed cap" (frontend mein "days/yr: 0" dikhta hai)
    max_days_per_year INTEGER NOT NULL DEFAULT 0
        CHECK (max_days_per_year >= 0),

    -- Kya next year carry forward ho sakta hai?
    carry_forward_allowed BOOLEAN NOT NULL DEFAULT FALSE,

    -- Paid ya unpaid leave?
    is_paid BOOLEAN NOT NULL DEFAULT TRUE,

    -- Approve/reject workflow chahiye ya auto-approve?
    requires_approval BOOLEAN NOT NULL DEFAULT TRUE,

    -- Active/inactive (inactive types apply dropdown mein nahi dikhte)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Ek organization ke andar leave type ka naam unique hona chahiye
    CONSTRAINT unique_org_leave_type_name UNIQUE (organization_id, name)
);


-- ============================================
-- TABLE 2: LEAVES - Actual leave requests
-- ============================================
-- Kya hai: Employee ki apply ki hui leaves (pending/approved/rejected/cancelled)
-- Important:
--   - status flow: Pending -> Approved / Rejected / Cancelled
--   - is_half_day = TRUE ho toh half_day_session = 'Morning' | 'Afternoon'
--   - is_wfh = TRUE matlab "Work From Home" (ek tarah ka leave-like absence)
--   - number_of_days = business days ka count (auto-calculated by backend)
--   - approved_by / rejected_by organization_members ko point karte hain
-- ============================================

CREATE TABLE leaves (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kis organization ki leave hai?
    organization_id UUID NOT NULL
        REFERENCES organizations(id)
        ON DELETE CASCADE,

    -- Kaunse member ne apply kiya?
    employee_id UUID NOT NULL
        REFERENCES organization_members(id)
        ON DELETE CASCADE,

    -- Kaunsi leave type?
    leave_type_id UUID NOT NULL
        REFERENCES leave_types(id)
        ON DELETE RESTRICT,

    -- Start date (date only, time nahi)
    start_date DATE NOT NULL,

    -- End date (single day leave mein end_date = start_date)
    end_date DATE NOT NULL,

    -- Kitne din ki leave hai? (backend calculate karega business days)
    number_of_days NUMERIC(5, 2) NOT NULL DEFAULT 0
        CHECK (number_of_days >= 0),

    -- Half day leave hai?
    is_half_day BOOLEAN NOT NULL DEFAULT FALSE,

    -- Half day session: 'Morning' ya 'Afternoon' (sirf half day hone par)
    half_day_session VARCHAR(20)
        CHECK (
            half_day_session IS NULL
            OR half_day_session IN ('Morning', 'Afternoon')
        ),

    -- Work From Home request?
    is_wfh BOOLEAN NOT NULL DEFAULT FALSE,

    -- Employee ki wajah (reason)
    reason TEXT NOT NULL,

    -- Leave status
    status VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Cancelled')),

    -- Kisne approve/reject kiya? (organization_members.id)
    approved_by UUID
        REFERENCES organization_members(id)
        ON DELETE SET NULL,
    rejected_by UUID
        REFERENCES organization_members(id)
        ON DELETE SET NULL,

    -- Approver ka comment (approval / rejection note)
    approval_comment TEXT,

    -- Jab action hua (approve/reject/cancel)
    actioned_at TIMESTAMP,

    -- Kab apply hua?
    applied_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- end_date start_date se pehle nahi ho sakta
    CONSTRAINT valid_leave_dates CHECK (end_date >= start_date),

    -- Half day hone par session compulsory hai
    CONSTRAINT half_day_requires_session CHECK (
        is_half_day = FALSE
        OR (is_half_day = TRUE AND half_day_session IS NOT NULL)
    ),

    -- Half day leave ek hi din ki honi chahiye
    CONSTRAINT half_day_single_day CHECK (
        is_half_day = FALSE
        OR (is_half_day = TRUE AND start_date = end_date)
    ),

    -- Reject hone par rejected_by set hona chahiye
    CONSTRAINT rejected_requires_rejecter CHECK (
        status <> 'Rejected'
        OR rejected_by IS NOT NULL
    ),

    -- Approve hone par approved_by set hona chahiye
    CONSTRAINT approved_requires_approver CHECK (
        status <> 'Approved'
        OR approved_by IS NOT NULL
    )
);


-- ============================================
-- TABLE 3: LEAVE_ATTACHMENTS - Leave ke saath documents
-- ============================================
-- Kya hai: Leave request ke saath uploaded files (medical certificate, etc.)
-- Important:
--   - Ek leave ke multiple attachments ho sakte hain
--   - File storage external hai (S3 / Cloudinary / etc.)
--   - Yahan sirf metadata + URL store hota hai
-- ============================================

CREATE TABLE leave_attachments (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Kis leave ka attachment?
    leave_id UUID NOT NULL
        REFERENCES leaves(id)
        ON DELETE CASCADE,

    -- File ka original naam (dikhane ke liye)
    file_name VARCHAR(255) NOT NULL,

    -- File ka URL (storage path)
    file_url TEXT NOT NULL,

    -- MIME type (e.g. image/png, application/pdf)
    file_type VARCHAR(100),

    -- File size in bytes
    file_size BIGINT,

    -- Kab upload hua?
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- PERFORMANCE INDEXES
-- ============================================
-- Frontend query pattern ke hisaab se indexes:
--   - orgId ke saath filter (always)
--   - status filter
--   - search by employee name / email (trigram fuzzy)
--   - date range filter
--   - pagination sorting by applied_date DESC
-- ============================================

-- pg_trgm already enabled hai (users schema se), but safety ke liye:
CREATE EXTENSION IF NOT EXISTS pg_trgm;


-- --------------------------------------------
-- INDEXES: leave_types
-- --------------------------------------------
CREATE INDEX idx_leave_types_org ON leave_types (organization_id);
CREATE INDEX idx_leave_types_org_active
    ON leave_types (organization_id)
    WHERE is_active = TRUE;

-- Fuzzy search by leave type name
CREATE INDEX idx_leave_types_name_trgm
    ON leave_types USING gin (name gin_trgm_ops);


-- --------------------------------------------
-- INDEXES: leaves
-- --------------------------------------------
-- Org filter (almost every query)
CREATE INDEX idx_leaves_org ON leaves (organization_id);

-- Employee ki apni leaves (edit/cancel permission check ke liye)
CREATE INDEX idx_leaves_employee ON leaves (employee_id);

-- Leave type JOIN
CREATE INDEX idx_leaves_leave_type ON leaves (leave_type_id);

-- Status exact filter (Pending / Approved / Rejected / Cancelled)
CREATE INDEX idx_leaves_status ON leaves (status);

-- Sorting by applied_date DESC (newest first)
CREATE INDEX idx_leaves_applied_desc
    ON leaves (applied_date DESC);

-- Date range filter (overlap queries)
CREATE INDEX idx_leaves_dates
    ON leaves (start_date, end_date);

-- Composite: org + status (most common: "org ke saare pending leaves")
CREATE INDEX idx_leaves_org_status
    ON leaves (organization_id, status);

-- Composite: org + status + applied DESC (paginated listing)
CREATE INDEX idx_leaves_org_status_applied
    ON leaves (organization_id, status, applied_date DESC);

-- Composite: org + applied DESC (default listing)
CREATE INDEX idx_leaves_org_applied
    ON leaves (organization_id, applied_date DESC);

-- Partial: sirf pending leaves (approvals dashboard ke liye)
CREATE INDEX idx_leaves_pending
    ON leaves (organization_id, applied_date DESC)
    WHERE status = 'Pending';

-- Partial: sirf approved leaves (calendar/reports ke liye)
CREATE INDEX idx_leaves_approved
    ON leaves (organization_id, start_date, end_date)
    WHERE status = 'Approved';


-- --------------------------------------------
-- INDEXES: leave_attachments
-- --------------------------------------------
CREATE INDEX idx_leave_attachments_leave
    ON leave_attachments (leave_id);


-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
-- Har UPDATE par updated_at automatically current timestamp ho jaye
-- ============================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leave_types_updated_at
BEFORE UPDATE ON leave_types
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_leaves_updated_at
BEFORE UPDATE ON leaves
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ============================================
-- TRIGGER: Auto-calculate number_of_days
-- ============================================
-- Jab bhi leave insert/update ho, number_of_days auto-calculate ho jaye
-- Rules:
--   - Half day   -> 0.5
--   - WFH        -> business days count (frontend WFH ko bhi leave treat karta hai)
--   - Full day   -> business days count (Mon-Fri, weekends exclude)
-- NOTE: Agar aapke paas company holidays table hai,
--       toh yahan holiday exclusion bhi add kar sakte hain.
-- ============================================

CREATE OR REPLACE FUNCTION calculate_leave_days()
RETURNS TRIGGER AS $$
DECLARE
    v_days INTEGER := 0;
    v_current DATE;
BEGIN
    -- Half day -> 0.5 din
    IF NEW.is_half_day = TRUE THEN
        NEW.number_of_days := 0.5;
        RETURN NEW;
    END IF;

    -- Full day / WFH -> business days count (Mon-Fri)
    v_current := NEW.start_date;
    WHILE v_current <= NEW.end_date LOOP
        -- EXTRACT(DOW) = 0 (Sunday) .. 6 (Saturday)
        IF EXTRACT(DOW FROM v_current) NOT IN (0, 6) THEN
            v_days := v_days + 1;
        END IF;
        v_current := v_current + INTERVAL '1 day';
    END LOOP;

    -- Kam se kam 1 din (agar poora weekend ho toh bhi invalid na ho)
    IF v_days < 1 THEN
        v_days := 1;
    END IF;

    NEW.number_of_days := v_days;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaves_calc_days
BEFORE INSERT OR UPDATE OF start_date, end_date, is_half_day
ON leaves
FOR EACH ROW
EXECUTE FUNCTION calculate_leave_days();


-- ============================================
-- TRIGGER: Auto-set actioned_at on status change
-- ============================================
-- Jab status Pending se Approved/Rejected/Cancelled ho, actioned_at set ho jaye
-- ============================================

CREATE OR REPLACE FUNCTION set_actioned_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status <> 'Pending'
       AND (OLD.status IS DISTINCT FROM NEW.status) THEN
        NEW.actioned_at := CURRENT_TIMESTAMP;
    END IF;

    -- Revert to pending ho toh actioned_at clear ho jaye
    IF NEW.status = 'Pending' THEN
        NEW.actioned_at := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaves_actioned_at
BEFORE UPDATE OF status ON leaves
FOR EACH ROW
EXECUTE FUNCTION set_actioned_at();


-- ============================================
-- TRIGGER: Enforce paid leave for unpaid types
-- ============================================
-- Agar leave type is_paid = FALSE hai toh request ka is_paid false hoga
-- (Frontend mapLeave is_paid ko leave record se padhta hai)
-- NOTE: Agar aap is_paid ko `leaves` table mein denormalize karna chahte ho,
--       toh ye column add karo. Neeche optional column add kiya hai.
-- ============================================

-- Optional denormalized column (frontend ke liye handy)
ALTER TABLE leaves
    ADD COLUMN is_paid BOOLEAN;

-- Sync trigger
CREATE OR REPLACE FUNCTION sync_leave_paid_flag()
RETURNS TRIGGER AS $$
DECLARE
    v_is_paid BOOLEAN;
BEGIN
    SELECT is_paid INTO v_is_paid
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    NEW.is_paid := COALESCE(v_is_paid, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaves_sync_paid
BEFORE INSERT OR UPDATE OF leave_type_id
ON leaves
FOR EACH ROW
EXECUTE FUNCTION sync_leave_paid_flag();


-- ============================================
-- AUTO-APPROVE TRIGGER (requires_approval = FALSE)
-- ============================================
-- Agar leave type ka requires_approval = FALSE hai,
-- toh insert hote hi status = 'Approved' ho jaye.
-- ============================================

CREATE OR REPLACE FUNCTION auto_approve_leave()
RETURNS TRIGGER AS $$
DECLARE
    v_requires_approval BOOLEAN;
BEGIN
    SELECT requires_approval INTO v_requires_approval
    FROM leave_types
    WHERE id = NEW.leave_type_id;

    -- Agar approval nahi chahiye, aur status Pending hai
    IF v_requires_approval = FALSE AND NEW.status = 'Pending' THEN
        NEW.status := 'Approved';
        NEW.actioned_at := CURRENT_TIMESTAMP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_leaves_auto_approve
BEFORE INSERT ON leaves
FOR EACH ROW
EXECUTE FUNCTION auto_approve_leave();


-- ============================================
-- SEED: Default leave types (optional)
-- ============================================
-- Agar aap chahte ho ki har naye org ke liye standard leave types ban jaayein,
-- toh neeche wala trigger use karo (organizations insert par).
-- NOTE: Ye optional hai. Chahiye toh uncomment karo.
-- ============================================

/*
CREATE OR REPLACE FUNCTION seed_default_leave_types()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO leave_types
        (organization_id, name, description, max_days_per_year,
         carry_forward_allowed, is_paid, requires_approval, is_active)
    VALUES
        (NEW.id, 'Annual Leave', 'Paid annual/vacation leave', 20, TRUE, TRUE, TRUE, TRUE),
        (NEW.id, 'Sick Leave', 'Paid sick leave', 10, FALSE, TRUE, TRUE, TRUE),
        (NEW.id, 'Casual Leave', 'Short casual leave', 5, FALSE, TRUE, TRUE, TRUE),
        (NEW.id, 'Unpaid Leave', 'Leave without pay', 0, FALSE, FALSE, TRUE, TRUE);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seed_default_leave_types
AFTER INSERT ON organizations
FOR EACH ROW
EXECUTE FUNCTION seed_default_leave_types();
*/


-- ============================================
-- SUMMARY: Kis query mein kaunsa index use hoga?
-- ============================================
-- 1. List org leaves (paginated):            idx_leaves_org_applied
-- 2. Filter by status:                       idx_leaves_org_status
-- 3. Pending approvals dashboard:            idx_leaves_pending (partial)
-- 4. Employee apni leaves:                   idx_leaves_employee
-- 5. Search by employee (trgm on members):   idx_om_name_trgm / idx_om_email_trgm
-- 6. Date range (calendar):                  idx_leaves_dates / idx_leaves_approved
-- 7. Leave type dropdown (active):           idx_leave_types_org_active
-- 8. Leave type fuzzy search:                idx_leave_types_name_trgm
-- 9. Attachments by leave:                   idx_leave_attachments_leave
-- ============================================