import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

const FN = "InterviewController";

// ============================================
// CREATE INTERVIEW
// ============================================
export const createInterview = async (req, res) => {
  const fn = `${FN}.createInterview`;
  try {
    const {
      candidate_id,
      round_name,
      interviewer,
      interview_type,
      duration,
      feedback,
      result,
      score,
      notes,
    } = req.body;

    if (!candidate_id || !round_name || !round_name.trim()) {
      return handleError(
        res,
        400,
        "candidate_id and round_name are required",
        null,
        fn,
      );
    }

    const finalResult = result || "Pending";
    const finalScore =
      score !== null && score !== undefined && score !== ""
        ? parseInt(score, 10)
        : null;

    if (
      finalScore !== null &&
      (isNaN(finalScore) || finalScore < 0 || finalScore > 100)
    ) {
      return handleError(
        res,
        400,
        "Score must be a number between 0 and 100",
        null,
        fn,
      );
    }

    const insert = await pool.query(
      `INSERT INTO candidate_interviews (
        candidate_id, round_name, interviewer, interview_type,
        duration, feedback, result, score, notes
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        candidate_id,
        round_name.trim(),
        interviewer || null,
        interview_type || null,
        duration || null,
        feedback || null,
        finalResult,
        finalScore,
        notes || null,
      ],
    );

    // Auto-transition candidate -> Interviewing (if currently early stage)
    await pool.query(
      `UPDATE candidates
       SET status = 'Interviewing'
       WHERE id = $1 AND status IN ('Applied', 'Screening')`,
      [candidate_id],
    );

    return handleSuccess(
      res,
      201,
      "Interview recorded successfully",
      insert.rows[0],
      fn,
    );
  } catch (err) {
    if (err.code === "23514") {
      return handleError(
        res,
        400,
        "Invalid result or score (score must be 0-100)",
        err,
        fn,
      );
    }
    return handleError(res, 500, "Failed to create interview", err, fn);
  }
};

// ============================================
// GET INTERVIEWS BY CANDIDATE
// ============================================
export const getInterviewsByCandidate = async (req, res) => {
  const fn = `${FN}.getInterviewsByCandidate`;
  try {
    const { candidateId } = req.params;

    const result = await pool.query(
      `SELECT * FROM candidate_interviews
       WHERE candidate_id = $1
       ORDER BY created_at ASC`,
      [candidateId],
    );

    return handleSuccess(
      res,
      200,
      "Interviews fetched successfully",
      result.rows,
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to fetch interviews", err, fn);
  }
};

// ============================================
// UPDATE INTERVIEW
// ============================================
export const updateInterview = async (req, res) => {
  const fn = `${FN}.updateInterview`;
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowed = [
      "round_name",
      "interviewer",
      "interview_type",
      "duration",
      "feedback",
      "result",
      "score",
      "notes",
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
      `UPDATE candidate_interviews
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values,
    );

    if (!result.rows.length) {
      return handleError(res, 404, "Interview not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      "Interview updated successfully",
      result.rows[0],
      fn,
    );
  } catch (err) {
    if (err.code === "23514") {
      return handleError(
        res,
        400,
        "Invalid result or score (score must be 0-100)",
        err,
        fn,
      );
    }
    return handleError(res, 500, "Failed to update interview", err, fn);
  }
};

// ============================================
// DELETE INTERVIEW
// ============================================
export const deleteInterview = async (req, res) => {
  const fn = `${FN}.deleteInterview`;
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM candidate_interviews WHERE id = $1 RETURNING id",
      [id],
    );

    if (!result.rows.length) {
      return handleError(res, 404, "Interview not found", null, fn);
    }

    return handleSuccess(
      res,
      200,
      "Interview deleted successfully",
      { id },
      fn,
    );
  } catch (err) {
    return handleError(res, 500, "Failed to delete interview", err, fn);
  }
};
