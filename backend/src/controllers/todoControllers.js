import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

const getOrgId = (req) =>
  req.query.orgId || req.query.organizationId || req.body.orgId;
const getUserId = (user = {}) =>
  user.id || user.user_id || user.userId || user.sub || null;
const getTokenMemberId = (user = {}) =>
  user.member_id || user.memberId || user.organization_member_id || null;

// Reuse the standard resolution logic
const resolveMemberId = async (organizationId, user = {}) => {
  if (!organizationId) return null;
  const userId = getUserId(user);
  const tokenMemberId = getTokenMemberId(user);

  if (tokenMemberId) {
    const r = await pool.query(
      `SELECT id FROM organization_members WHERE id = $1 AND organization_id = $2 LIMIT 1`,
      [tokenMemberId, organizationId],
    );
    if (r.rows.length) return r.rows[0].id;
  }

  if (userId) {
    const r = await pool.query(
      `SELECT id FROM organization_members WHERE user_id = $1 AND organization_id = $2 ORDER BY (status = 'active') DESC LIMIT 1`,
      [userId, organizationId],
    );
    if (r.rows.length) return r.rows[0].id;
  }
  return null;
};

export const createTodo = async (req, res) => {
  const orgId = getOrgId(req);
  const user = req.user || {};

  // Fallback to body if req.user is empty (based on your original code)
  const fallbackMemberId = req.body.memberId;

  try {
    if (!orgId)
      return handleError(res, 400, "orgId is required", null, "createTodo");

    const memberId = (await resolveMemberId(orgId, user)) || fallbackMemberId;
    if (!memberId)
      return handleError(
        res,
        403,
        "Not a member of this organization",
        null,
        "createTodo",
      );

    const {
      title,
      description,
      priority,
      due_date,
      status,
      notes,
      attachments,
    } = req.body;

    if (!title)
      return handleError(res, 400, "Title is required", null, "createTodo");

    const result = await pool.query(
      `INSERT INTO todos 
        (organization_id, created_by, title, description, priority, due_date, status, notes, attachments)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        orgId,
        memberId,
        title,
        description || null,
        priority || "Medium",
        due_date || null,
        status || "Pending",
        notes || null,
        JSON.stringify(attachments || []),
      ],
    );

    return handleSuccess(
      res,
      201,
      "Todo created successfully",
      result.rows[0],
      "createTodo",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "createTodo",
    );
  }
};

export const getAllTodo = async (req, res) => {
  const orgId = getOrgId(req);

  try {
    if (!orgId)
      return handleError(res, 400, "orgId is required", null, "getAllTodo");

    const result = await pool.query(
      `SELECT t.*, creator.name AS created_by_name
       FROM todos t
       LEFT JOIN organization_members creator ON creator.id = t.created_by
       WHERE t.organization_id = $1
       ORDER BY t.created_at DESC`,
      [orgId],
    );

    return handleSuccess(
      res,
      200,
      "Todos fetched successfully",
      result.rows,
      "getAllTodo",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "getAllTodo",
    );
  }
};

export const getTodoById = async (req, res) => {
  const orgId = getOrgId(req);
  const { id } = req.params;

  try {
    if (!orgId)
      return handleError(res, 400, "orgId is required", null, "getTodoById");

    const result = await pool.query(
      `SELECT t.*, creator.name AS created_by_name
       FROM todos t
       LEFT JOIN organization_members creator ON creator.id = t.created_by
       WHERE t.id = $1 AND t.organization_id = $2`,
      [id, orgId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Todo not found", null, "getTodoById");
    }

    return handleSuccess(
      res,
      200,
      "Todo fetched successfully",
      result.rows[0],
      "getTodoById",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "getTodoById",
    );
  }
};

export const updateTodo = async (req, res) => {
  const orgId = getOrgId(req);
  const { id } = req.params;

  try {
    if (!orgId)
      return handleError(res, 400, "orgId is required", null, "updateTodo");

    const {
      title,
      description,
      priority,
      due_date,
      status,
      notes,
      attachments,
    } = req.body;

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
    setField("priority", priority);
    setField("due_date", due_date);
    setField("status", status);
    setField("notes", notes);

    if (attachments !== undefined) {
      fields.push(`attachments = $${idx++}`);
      values.push(JSON.stringify(attachments));
    }

    if (fields.length === 0) {
      return handleError(res, 400, "No fields to update", null, "updateTodo");
    }

    values.push(id, orgId);
    const result = await pool.query(
      `UPDATE todos SET ${fields.join(", ")} 
       WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Todo not found", null, "updateTodo");
    }

    return handleSuccess(
      res,
      200,
      "Todo updated successfully",
      result.rows[0],
      "updateTodo",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "updateTodo",
    );
  }
};

export const deleteTodo = async (req, res) => {
  const orgId = getOrgId(req);
  const { id } = req.params;

  try {
    if (!orgId)
      return handleError(res, 400, "orgId is required", null, "deleteTodo");

    const result = await pool.query(
      `DELETE FROM todos WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, orgId],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Todo not found", null, "deleteTodo");
    }

    return handleSuccess(
      res,
      200,
      "Todo deleted successfully",
      { id },
      "deleteTodo",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "deleteTodo",
    );
  }
};
