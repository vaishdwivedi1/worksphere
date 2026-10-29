import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

const FN = "JobController";

// ============================================
// Normalize any value into a REAL string array
// (for Postgres TEXT[] columns)
// ============================================
const toTextArray = (v) => {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) {
    return v.map((x) => String(x).trim()).filter((x) => x.length > 0);
  }
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).trim()).filter(Boolean);
        }
      } catch {
        /* ignore, fall through */
      }
    }
    return s
      .split(/\r?\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
};

const toWorkflowArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ============================================
// CREATE JOB
// ============================================
export const createJob = async (req, res) => {
  const fn = `${FN}.createJob`;
  try {
    const {
      organization_id,
      created_by,
      title,
      department,
      team,
      employment_type,
      experience_required,
      location,
      description,
      responsibilities,
      requirements,
      skills,
      hiring_workflow,
      screening_questions,
      approval_requested_by,
      approval_reason,
      approval_department,
      approval_team,
      total_rounds,
      status = "Draft",
    } = req.body;

    if (!organization_id || !title) {
      return handleError(
        res,
        400,
        "organization_id and title are required",
        null,
        fn,
      );
    }

    const reqs = toTextArray(requirements);
    const skillArr = toTextArray(skills);
    const sqs = toTextArray(screening_questions); // Filters empty strings
    const workflow = toWorkflowArray(hiring_workflow);

    const rounds =
      Number.isFinite(Number(total_rounds)) && Number(total_rounds) > 0
        ? Number(total_rounds)
        : workflow.length;

    const result = await pool.query(
      `INSERT INTO jobs (
        organization_id, created_by, title, department, team,
        employment_type, experience_required, location,
        description, responsibilities, requirements, skills,
        hiring_workflow, screening_questions,
        approval_requested_by, approval_reason,
        approval_department, approval_team,
        status, total_rounds
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20
      ) RETURNING *`,
      [
        organization_id,
        created_by ?? null,
        title,
        department ?? null,
        team ?? null,
        employment_type ?? null,
        experience_required ?? null,
        location ?? null,
        description ?? null,
        responsibilities ?? null,
        reqs,
        skillArr,
        JSON.stringify(workflow),
        sqs,
        approval_requested_by ?? null,
        approval_reason ?? null,
        approval_department ?? null,
        approval_team ?? null,
        status,
        rounds,
      ],
    );

    return handleSuccess(
      res,
      201,
      "Job created successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to create job", err, fn);
  }
};

// ============================================
// GET JOBS
// ============================================
export const getJobs = async (req, res) => {
  const fn = `${FN}.getJobs`;
  try {
    const {
      organization_id,
      status,
      department,
      search,
      page = 1,
      limit = 20,
      sort = "created_at",
      order = "DESC",
    } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (organization_id) {
      conditions.push(`organization_id = $${idx++}`);
      values.push(organization_id);
    }
    if (status && status !== "all") {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (department && department !== "all") {
      conditions.push(`department = $${idx++}`);
      values.push(department);
    }
    if (search) {
      conditions.push(`(title ILIKE $${idx} OR department ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = ["created_at", "updated_at", "title", "status"];
    const sortCol = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM jobs ${where}`,
      values,
    );
    const total = countResult.rows[0].count;

    values.push(limitNum, offset);
    const result = await pool.query(
      `SELECT * FROM jobs
       ${where}
       ORDER BY ${sortCol} ${sortOrder}
       LIMIT $${idx++} OFFSET $${idx++}`,
      values,
    );

    return handleSuccess(
      res,
      200,
      "Jobs fetched successfully",
      {
        jobs: result.rows,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch jobs", err, fn);
  }
};

// ============================================
// GET JOB BY ID
// ============================================
export const getJobById = async (req, res) => {
  const fn = `${FN}.getJobById`;
  try {
    const { id } = req.params;

    const jobResult = await pool.query("SELECT * FROM jobs WHERE id = $1", [
      id,
    ]);
    if (jobResult.rows.length === 0) {
      return handleError(res, 404, "Job not found", null, fn);
    }

    let statsResult = { rows: [] };
    try {
      statsResult = await pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM candidates
         WHERE job_id = $1
         GROUP BY status`,
        [id],
      );
    } catch {}

    return handleSuccess(
      res,
      200,
      "Job fetched successfully",
      {
        ...jobResult.rows[0],
        candidate_stats: statsResult.rows,
      },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch job", err, fn);
  }
};

// ============================================
// UPDATE JOB
// ============================================
export const updateJob = async (req, res) => {
  const fn = `${FN}.updateJob`;
  try {
    const { id } = req.params;
    const updates = { ...req.body };

    delete updates.id;
    delete updates.organization_id;
    delete updates.created_at;

    if (updates.requirements !== undefined)
      updates.requirements = toTextArray(updates.requirements);
    if (updates.skills !== undefined)
      updates.skills = toTextArray(updates.skills);
    if (updates.screening_questions !== undefined)
      updates.screening_questions = toTextArray(updates.screening_questions);

    if (updates.hiring_workflow !== undefined) {
      const wf = toWorkflowArray(updates.hiring_workflow);
      updates.hiring_workflow = JSON.stringify(wf);
      updates.total_rounds = wf.length;
    }

    const allowedFields = [
      "title",
      "department",
      "team",
      "employment_type",
      "experience_required",
      "location",
      "description",
      "responsibilities",
      "requirements",
      "skills",
      "hiring_workflow",
      "screening_questions",
      "approval_requested_by",
      "approval_reason",
      "approval_department",
      "approval_team",
      "status",
      "total_rounds",
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return handleError(res, 400, "No valid fields to update", null, fn);
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE jobs SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Job not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      "Job updated successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to update job", err, fn);
  }
};

// ============================================
// UPDATE JOB STATUS
// ============================================
export const updateJobStatus = async (req, res) => {
  const fn = `${FN}.updateJobStatus`;
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Draft", "Open", "Closed", "On Hold", "Filled"];
    if (!validStatuses.includes(status)) {
      return handleError(
        res,
        400,
        `Invalid status. Allowed: ${validStatuses.join(", ")}`,
        null,
        fn,
      );
    }

    const result = await pool.query(
      "UPDATE jobs SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Job not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      `Job status updated to ${status}`,
      result.rows[0],
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to update job status", err, fn);
  }
};

// ============================================
// DELETE JOB
// ============================================
export const deleteJob = async (req, res) => {
  const fn = `${FN}.deleteJob`;
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM jobs WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Job not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      "Job deleted successfully",
      { id: result.rows[0].id },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to delete job", err, fn);
  }
};
