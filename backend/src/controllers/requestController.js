import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

// ============================================
// Helpers
// ============================================

const getOrgId = (req) => req.query.orgId || req.query.organizationId;

/**
 * Extract the users.id from req.user regardless of how the
 * auth middleware names it (id / user_id / userId / sub).
 */
const getUserId = (user = {}) =>
  user.id || user.user_id || user.userId || user.sub || null;

/**
 * Extract a token-supplied member id (organization_members.id).
 */
const getTokenMemberId = (user = {}) =>
  user.member_id || user.memberId || user.organization_member_id || null;

/**
 * Resolve the organization_members.id for the authenticated user
 * within the given organization. Never trust client-supplied memberId.
 *
 * Returns: { memberId: string|null, reason: 'ok'|'no_user'|'not_member' }
 */
const resolveMemberId = async (organizationId, user = {}) => {
  if (!organizationId) return { memberId: null, reason: "no_user" };

  const userId = getUserId(user);
  const tokenMemberId = getTokenMemberId(user);

  // 1) Token-supplied member id — validate it belongs to this org
  if (tokenMemberId) {
    const r = await pool.query(
      `SELECT id FROM organization_members
       WHERE id = $1 AND organization_id = $2
       LIMIT 1`,
      [tokenMemberId, organizationId],
    );
    if (r.rows.length) {
      return { memberId: r.rows[0].id, reason: "ok" };
    }
  }

  // 2) Lookup by users.id (active member first, then any status)
  if (userId) {
    const r = await pool.query(
      `SELECT id FROM organization_members
       WHERE user_id = $1 AND organization_id = $2
       ORDER BY (status = 'active') DESC, created_at ASC
       LIMIT 1`,
      [userId, organizationId],
    );
    if (r.rows.length) {
      return { memberId: r.rows[0].id, reason: "ok" };
    }
  }

  return {
    memberId: null,
    reason: userId || tokenMemberId ? "not_member" : "no_user",
  };
};

// Validate that a member belongs to the org (for assigned_to / resolved_by)
const isMemberOfOrg = async (memberId, organizationId) => {
  if (!memberId) return false;
  const r = await pool.query(
    `SELECT 1 FROM organization_members
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [memberId, organizationId],
  );
  return r.rows.length > 0;
};

/**
 * Shared guard: resolves the caller's member id and, on failure,
 * writes the correct 401/403 response and returns null.
 * Callers should `return` immediately when this returns null.
 */
const requireMember = async (res, organizationId, user, action) => {
  const { memberId, reason } = await resolveMemberId(organizationId, user);

  if (reason === "no_user") {
    handleError(
      res,
      401,
      "Authentication required. Missing or invalid token.",
      null,
      action,
    );
    return null;
  }

  if (!memberId) {
    console.warn(
      `[${action}] user=${getUserId(user)} tokenMember=${getTokenMemberId(
        user,
      )} org=${organizationId} -> not a member`,
    );
    handleError(
      res,
      403,
      "You are not a member of this organization",
      null,
      action,
    );
    return null;
  }

  return memberId;
};

// ============================================
// CREATE a request
// ============================================
export const createRequest = async (req, res) => {
  const organizationId = getOrgId(req);
  const user = req.user || {};

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "createRequest",
    );
  }

  try {
    const memberId = await requireMember(
      res,
      organizationId,
      user,
      "createRequest",
    );
    if (!memberId) return;

    const { title, description, category, priority, assigned_to, attachments } =
      req.body;

    if (!title || !title.trim()) {
      return handleError(res, 400, "Title is required", null, "createRequest");
    }

    if (assigned_to) {
      const ok = await isMemberOfOrg(assigned_to, organizationId);
      if (!ok) {
        return handleError(
          res,
          400,
          "assigned_to is not a member of this organization",
          null,
          "createRequest",
        );
      }
    }

    const result = await pool.query(
      `INSERT INTO requests
        (organization_id, created_by, assigned_to, title, description, category, priority, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        organizationId,
        memberId,
        assigned_to || null,
        title.trim(),
        description || null,
        category || "General",
        priority || "Medium",
        JSON.stringify(attachments || []),
      ],
    );

    return handleSuccess(
      res,
      201,
      "Request created successfully",
      result.rows[0],
      "createRequest",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "createRequest");
  }
};

// ============================================
// GET all requests (with filters)
// ============================================
export const getRequests = async (req, res) => {
  const organizationId = getOrgId(req);

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "getRequests",
    );
  }

  try {
    const { status, category, assigned_to, search } = req.query;

    const conditions = ["r.organization_id = $1"];
    const values = [organizationId];
    let idx = 2;

    if (status && status !== "all") {
      conditions.push(`r.status = $${idx++}`);
      values.push(status);
    }
    if (category && category !== "all") {
      conditions.push(`r.category = $${idx++}`);
      values.push(category);
    }
    if (assigned_to) {
      conditions.push(`r.assigned_to = $${idx++}`);
      values.push(assigned_to);
    }
    if (search && search.trim()) {
      conditions.push(`(r.title ILIKE $${idx} OR r.description ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const result = await pool.query(
      `SELECT
         r.*,
         creator.name AS created_by_name,
         creator.email AS created_by_email,
         assignee.name AS assigned_to_name,
         assignee.email AS assigned_to_email,
         (SELECT COUNT(*) FROM request_comments rc WHERE rc.request_id = r.id) AS comment_count
       FROM requests r
       LEFT JOIN organization_members creator ON creator.id = r.created_by
       LEFT JOIN organization_members assignee ON assignee.id = r.assigned_to
       WHERE ${conditions.join(" AND ")}
       ORDER BY r.created_at DESC`,
      values,
    );

    return handleSuccess(
      res,
      200,
      "Requests fetched successfully",
      result.rows,
      "getRequests",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "getRequests");
  }
};

// ============================================
// GET a single request (with comments)
// ============================================
export const getRequestById = async (req, res) => {
  const organizationId = getOrgId(req);

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "getRequestById",
    );
  }

  try {
    const { id } = req.params;

    const requestResult = await pool.query(
      `SELECT
         r.*,
         creator.name AS created_by_name,
         creator.email AS created_by_email,
         assignee.name AS assigned_to_name,
         assignee.email AS assigned_to_email
       FROM requests r
       LEFT JOIN organization_members creator ON creator.id = r.created_by
       LEFT JOIN organization_members assignee ON assignee.id = r.assigned_to
       WHERE r.id = $1 AND r.organization_id = $2`,
      [id, organizationId],
    );

    if (requestResult.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "getRequestById");
    }

    const commentsResult = await pool.query(
      `SELECT
         rc.*,
         author.name AS author_name,
         author.email AS author_email
       FROM request_comments rc
       LEFT JOIN organization_members author ON author.id = rc.author_id
       WHERE rc.request_id = $1
       ORDER BY rc.created_at ASC`,
      [id],
    );

    return handleSuccess(
      res,
      200,
      "Request fetched successfully",
      { ...requestResult.rows[0], comments: commentsResult.rows },
      "getRequestById",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "getRequestById");
  }
};

// ============================================
// UPDATE a request
// ============================================
export const updateRequest = async (req, res) => {
  const organizationId = getOrgId(req);
  const user = req.user || {};

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "updateRequest",
    );
  }

  try {
    const { id } = req.params;
    const {
      title,
      description,
      category,
      status,
      priority,
      assigned_to,
      attachments,
      resolution,
    } = req.body;

    if (assigned_to) {
      const ok = await isMemberOfOrg(assigned_to, organizationId);
      if (!ok) {
        return handleError(
          res,
          400,
          "assigned_to is not a member of this organization",
          null,
          "updateRequest",
        );
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const setField = (col, val) => {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      }
    };

    setField("title", title);
    setField("description", description);
    setField("category", category);
    setField("status", status);
    setField("priority", priority);
    setField("assigned_to", assigned_to);
    setField(
      "attachments",
      attachments !== undefined ? JSON.stringify(attachments) : undefined,
    );
    setField("resolution", resolution);

    if (status === "Resolved") {
      const memberId = await requireMember(
        res,
        organizationId,
        user,
        "updateRequest",
      );
      if (!memberId) return;
      fields.push(`resolved_at = CURRENT_TIMESTAMP`);
      fields.push(`resolved_by = $${idx++}`);
      values.push(memberId);
    }
    if (status === "Closed") {
      fields.push(`closed_at = CURRENT_TIMESTAMP`);
    }

    if (fields.length === 0) {
      return handleError(
        res,
        400,
        "No fields to update",
        null,
        "updateRequest",
      );
    }

    values.push(id, organizationId);
    const result = await pool.query(
      `UPDATE requests
       SET ${fields.join(", ")}
       WHERE id = $${idx++} AND organization_id = $${idx}
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "updateRequest");
    }

    return handleSuccess(
      res,
      200,
      "Request updated successfully",
      result.rows[0],
      "updateRequest",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "updateRequest");
  }
};

// ============================================
// DELETE a request
// ============================================
export const deleteRequest = async (req, res) => {
  const organizationId = getOrgId(req);

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "deleteRequest",
    );
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM requests WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, organizationId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "deleteRequest");
    }

    return handleSuccess(
      res,
      200,
      "Request deleted successfully",
      { id },
      "deleteRequest",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "deleteRequest");
  }
};

// ============================================
// CLOSE a request
// ============================================
export const closeRequest = async (req, res) => {
  const organizationId = getOrgId(req);

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "closeRequest",
    );
  }

  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE requests
       SET status = 'Closed', closed_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      [id, organizationId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "closeRequest");
    }

    return handleSuccess(
      res,
      200,
      "Request closed successfully",
      result.rows[0],
      "closeRequest",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "closeRequest");
  }
};

// ============================================
// ADD a comment
// ============================================
export const addComment = async (req, res) => {
  const organizationId = getOrgId(req);
  const user = req.user || {};

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "addComment",
    );
  }

  try {
    const memberId = await requireMember(
      res,
      organizationId,
      user,
      "addComment",
    );
    if (!memberId) return;

    const { id } = req.params;
    const { comment, is_internal } = req.body;

    if (!comment || !comment.trim()) {
      return handleError(res, 400, "Comment is required", null, "addComment");
    }

    const check = await pool.query(
      `SELECT id FROM requests WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    if (check.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "addComment");
    }

    const result = await pool.query(
      `INSERT INTO request_comments (request_id, author_id, comment, is_internal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, memberId, comment.trim(), is_internal || false],
    );

    return handleSuccess(
      res,
      201,
      "Comment added",
      result.rows[0],
      "addComment",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "addComment");
  }
};

// ============================================
// GET comments for a request
// ============================================
export const getComments = async (req, res) => {
  const organizationId = getOrgId(req);

  if (!organizationId) {
    return handleError(
      res,
      400,
      "organizationId is required in query (?orgId=...)",
      null,
      "getComments",
    );
  }

  try {
    const { id } = req.params;

    const check = await pool.query(
      `SELECT id FROM requests WHERE id = $1 AND organization_id = $2`,
      [id, organizationId],
    );
    if (check.rows.length === 0) {
      return handleError(res, 404, "Request not found", null, "getComments");
    }

    const result = await pool.query(
      `SELECT
         rc.*,
         author.name AS author_name,
         author.email AS author_email
       FROM request_comments rc
       LEFT JOIN organization_members author ON author.id = rc.author_id
       WHERE rc.request_id = $1
       ORDER BY rc.created_at ASC`,
      [id],
    );

    return handleSuccess(
      res,
      200,
      "Comments fetched successfully",
      result.rows,
      "getComments",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "getComments");
  }
};
