import pool from "../config/postgres.js";
import { handleError, handleSuccess } from "../commonFunctions/commonError.js";

const FN = "CandidateController";

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
      screening_answers,
      salary_expectation,
      linkedin_url,
      portfolio_url,
      github_url,
      current_company,
      current_designation,
      hr_call_notes,
      hr_call_status,
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

    const finalStage = stage && stage.trim() ? stage : "Applied";

    const result = await pool.query(
      `INSERT INTO candidates (
        job_id, organization_id, name, email, phone,
        resume_url, experience, notice_period, stage, status, screening_answers,
        salary_expectation, linkedin_url, portfolio_url, github_url,
        current_company, current_designation, hr_call_notes, hr_call_status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING *`,
      [
        job_id,
        organization_id,
        name,
        email,
        phone || null,
        resume_url || null,
        experience || null,
        notice_period || null,
        finalStage,
        "Applied",
        JSON.stringify(screening_answers || {}),
        salary_expectation || null,
        linkedin_url || null,
        portfolio_url || null,
        github_url || null,
        current_company || null,
        current_designation || null,
        hr_call_notes || null,
        hr_call_status || "Pending",
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
      limit = 50,
      sort = "created_at",
      order = "DESC",
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
    if (status && status !== "all") {
      conditions.push(`status = $${idx++}`);
      values.push(status);
    }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    const allowedSort = ["created_at", "updated_at", "name", "status"];
    const sortCol = allowedSort.includes(sort) ? sort : "created_at";
    const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM candidates ${where}`,
      values,
    );
    const total = countResult.rows[0].count;

    values.push(limitNum, offset);
    const result = await pool.query(
      `SELECT * FROM candidates ${where} ORDER BY ${sortCol} ${sortOrder} LIMIT $${idx++} OFFSET $${idx++}`,
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
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch candidates", err, fn);
  }
};

// ============================================
// GET CANDIDATE BY ID (with rounds)
// ============================================
export const getCandidateById = async (req, res) => {
  const fn = `${FN}.getCandidateById`;
  try {
    const { id } = req.params;

    const candidate = await pool.query(
      "SELECT * FROM candidates WHERE id = $1",
      [id],
    );
    if (!candidate.rows.length) {
      return handleError(res, 404, "Candidate not found", null, fn);
    }

    const interviews = await pool.query(
      `SELECT * FROM candidate_interviews WHERE candidate_id = $1 ORDER BY created_at ASC`,
      [id],
    );

    const rounds = await pool.query(
      `SELECT * FROM candidate_rounds WHERE candidate_id = $1 ORDER BY round_number ASC, created_at ASC`,
      [id],
    );

    return handleSuccess(
      res,
      200,
      "Candidate fetched successfully",
      {
        ...candidate.rows[0],
        interviews: interviews.rows,
        rounds: rounds.rows,
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
      "screening_answers",
      "salary_expectation",
      "linkedin_url",
      "portfolio_url",
      "github_url",
      "current_company",
      "current_designation",
      "hr_call_notes",
      "hr_call_status",
    ];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(
          key === "screening_answers"
            ? JSON.stringify(updates[key])
            : updates[key],
        );
      }
    }

    if (!fields.length)
      return handleError(res, 400, "No valid fields to update", null, fn);

    values.push(id);
    const result = await pool.query(
      `UPDATE candidates SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!result.rows.length)
      return handleError(res, 404, "Candidate not found", null, fn);

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
    if (!result.rows.length)
      return handleError(res, 404, "Candidate not found", null, fn);
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
    if (!cand.rows.length)
      return handleError(res, 404, "Candidate not found", null, fn);

    await pool.query("DELETE FROM candidates WHERE id = $1", [id]);
    await pool.query(
      `UPDATE jobs SET total_applicants = GREATEST(total_applicants - 1, 0) WHERE id = $1`,
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

// ============================================
// ============ ROUNDS CRUD ===================
// ============================================

export const createRound = async (req, res) => {
  const fn = `${FN}.createRound`;
  try {
    const {
      candidate_id,
      round_number,
      round_name,
      round_type,
      interviewer,
      status,
      questions_asked,
      overall_feedback,
      overall_score,
      scheduled_at,
      conducted_at,
    } = req.body;

    if (!candidate_id || !round_name) {
      return handleError(
        res,
        400,
        "candidate_id and round_name are required",
        null,
        fn,
      );
    }

    const result = await pool.query(
      `INSERT INTO candidate_rounds (
        candidate_id, round_number, round_name, round_type, interviewer, status,
        questions_asked, overall_feedback, overall_score, scheduled_at, conducted_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        candidate_id,
        round_number || 1,
        round_name,
        round_type || "Interview",
        interviewer || null,
        status || "Pending",
        JSON.stringify(questions_asked || []),
        overall_feedback || null,
        overall_score != null && overall_score !== ""
          ? parseInt(overall_score, 10)
          : null,
        scheduled_at || null,
        conducted_at || null,
      ],
    );

    return handleSuccess(
      res,
      201,
      "Round created successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    if (err.code === "23514")
      return handleError(res, 400, "Invalid status or score", err, fn);
    return handleError(res, 500, "Failed to create round", err, fn);
  }
};

export const updateRound = async (req, res) => {
  const fn = `${FN}.updateRound`;
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = [
      "round_number",
      "round_name",
      "round_type",
      "interviewer",
      "status",
      "questions_asked",
      "overall_feedback",
      "overall_score",
      "scheduled_at",
      "conducted_at",
    ];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(
          key === "questions_asked"
            ? JSON.stringify(updates[key])
            : key === "overall_score" &&
                updates[key] !== null &&
                updates[key] !== ""
              ? parseInt(updates[key], 10)
              : updates[key],
        );
      }
    }

    if (!fields.length)
      return handleError(res, 400, "No valid fields to update", null, fn);

    values.push(id);
    const result = await pool.query(
      `UPDATE candidate_rounds SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (!result.rows.length)
      return handleError(res, 404, "Round not found", null, fn);

    return handleSuccess(
      res,
      200,
      "Round updated successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    if (err.code === "23514")
      return handleError(res, 400, "Invalid status or score", err, fn);
    return handleError(res, 500, "Failed to update round", err, fn);
  }
};

export const deleteRound = async (req, res) => {
  const fn = `${FN}.deleteRound`;
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM candidate_rounds WHERE id = $1 RETURNING id",
      [id],
    );
    if (!result.rows.length)
      return handleError(res, 404, "Round not found", null, fn);
    return handleSuccess(res, 200, "Round deleted successfully", { id }, fn);
  } catch (err) {
    return handleError(res, 500, "Failed to delete round", err, fn);
  }
};
