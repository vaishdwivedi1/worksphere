import pool from "../config/postgres.js";
import { handleError, handleSuccess } from "../commonFunctions/commonError.js";

const FN = "CandidateController";

// ============================================
// CREATE CANDIDATE
// ============================================
export const createCandidate = async (req, res) => {
  const fn = `${FN}.createCandidate`;
  try {
    const {
      job_id,
      organization_id,
      name,
      email,
      phone,
      resume_url,
      experience,
      notice_period,
      stage,
    } = req.body;

    if (!job_id || !organization_id || !name || !email) {
      return handleError(
        res,
        400,
        "job_id, organization_id, name and email are required",
        null,
        fn,
      );
    }

    const result = await pool.query(
      `INSERT INTO candidates (
        job_id, organization_id, name, email, phone,
        resume_url, experience, notice_period, stage
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        job_id,
        organization_id,
        name,
        email,
        phone,
        resume_url,
        experience,
        notice_period,
        stage,
      ],
    );

    await pool.query(
      "UPDATE jobs SET total_applicants = total_applicants + 1 WHERE id = $1",
      [job_id],
    );

    return handleSuccess(
      res,
      201,
      "Candidate added successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    if (err.code === "23505") {
      return handleError(
        res,
        409,
        "This email has already applied to this job",
        err,
        fn,
      );
    }
    return handleError(res, 500, "Failed to add candidate", err, fn);
  }
};

// ============================================
// GET CANDIDATES
// ============================================
export const getCandidates = async (req, res) => {
  const fn = `${FN}.getCandidates`;
  try {
    const {
      job_id,
      organization_id,
      status,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (job_id) {
      conditions.push(`job_id = $${idx++}`);
      values.push(job_id);
    }
    if (organization_id) {
      conditions.push(`organization_id = $${idx++}`);
      values.push(organization_id);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM candidates ${where}`,
      values,
    );
    const total = parseInt(countResult.rows[0].count);

    const offset = (page - 1) * limit;
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT * FROM candidates ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      values,
    );

    return handleSuccess(
      res,
      200,
      "Candidates fetched successfully",
      {
        candidates: result.rows,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit),
        },
      },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch candidates", err, fn);
  }
};

// ============================================
// GET SINGLE CANDIDATE + INTERVIEW HISTORY
// ============================================
export const getCandidateById = async (req, res) => {
  const fn = `${FN}.getCandidateById`;
  try {
    const { id } = req.params;

    const candidate = await pool.query(
      "SELECT * FROM candidates WHERE id = $1",
      [id],
    );
    if (candidate.rows.length === 0) {
      return handleError(res, 404, "Candidate not found", null, fn);
    }

    const interviews = await pool.query(
      `SELECT * FROM candidate_interviews
       WHERE candidate_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    return handleSuccess(
      res,
      200,
      "Candidate fetched successfully",
      {
        ...candidate.rows[0],
        interviews: interviews.rows,
      },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch candidate", err, fn);
  }
};

// ============================================
// UPDATE CANDIDATE
// ============================================
export const updateCandidate = async (req, res) => {
  const fn = `${FN}.updateCandidate`;
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = [
      "name",
      "email",
      "phone",
      "resume_url",
      "experience",
      "notice_period",
      "status",
      "stage",
    ];

    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(updates[key]);
      }
    }

    if (!fields.length) {
      return handleError(res, 400, "No valid fields to update", null, fn);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE candidates SET ${fields.join(", ")}
       WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!result.rows.length) {
      return handleError(res, 404, "Candidate not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      "Candidate updated successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to update candidate", err, fn);
  }
};

// ============================================
// UPDATE CANDIDATE STATUS
// ============================================
export const updateCandidateStatus = async (req, res) => {
  const fn = `${FN}.updateCandidateStatus`;
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Applied",
      "Screening",
      "Interviewing",
      "Selected",
      "Rejected",
      "Offered",
      "Joined",
    ];
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
      "UPDATE candidates SET status = $1 WHERE id = $2 RETURNING *",
      [status, id],
    );

    if (!result.rows.length) {
      return handleError(res, 404, "Candidate not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      `Candidate status updated to ${status}`,
      result.rows[0],
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to update candidate status", err, fn);
  }
};

// ============================================
// DELETE CANDIDATE
// ============================================
export const deleteCandidate = async (req, res) => {
  const fn = `${FN}.deleteCandidate`;
  try {
    const { id } = req.params;

    const cand = await pool.query(
      "SELECT job_id FROM candidates WHERE id = $1",
      [id],
    );
    if (!cand.rows.length) {
      return handleError(res, 404, "Candidate not found", null, fn);
    }

    await pool.query("DELETE FROM candidates WHERE id = $1", [id]);
    await pool.query(
      `UPDATE jobs
       SET total_applicants = GREATEST(total_applicants - 1, 0)
       WHERE id = $1`,
      [cand.rows[0].job_id],
    );

    return handleSuccess(
      res,
      200,
      "Candidate deleted successfully",
      { id },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to delete candidate", err, fn);
  }
};
