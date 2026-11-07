import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

const getOrgId = (req) => req.query.orgId || req.query.organizationId;

const getUserId = (user = {}) =>
  user.id || user.user_id || user.userId || user.sub || null;

const getTokenMemberId = (user = {}) =>
  user.member_id || user.memberId || user.organization_member_id || null;

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

// CREATE
export const createAnnouncement = async (req, res) => {
  const organizationId = getOrgId(req);
  const user = req.user || {};

  if (!organizationId)
    return handleError(
      res,
      400,
      "organizationId is required",
      null,
      "createAnnouncement",
    );

  try {
    const memberId = await resolveMemberId(organizationId, user);
    if (!memberId)
      return handleError(
        res,
        403,
        "Not a member of this organization",
        null,
        "createAnnouncement",
      );

    const {
      title,
      description,
      type,
      recipient_type,
      target_department,
      target_team_id,
      target_member_ids,
    } = req.body;

    if (!title || !description) {
      return handleError(
        res,
        400,
        "Title and description are required",
        null,
        "createAnnouncement",
      );
    }

    const result = await pool.query(
      `INSERT INTO announcements 
        (organization_id, created_by, title, description, type, recipient_type, target_department, target_team_id, target_member_ids)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        organizationId,
        memberId,
        title,
        description,
        type || "General",
        recipient_type || "Entire Organization",
        target_department || null,
        target_team_id || null,
        JSON.stringify(target_member_ids || []),
      ],
    );

    return handleSuccess(
      res,
      201,
      "Announcement created",
      result.rows[0],
      "createAnnouncement",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "createAnnouncement");
  }
};

// GET ALL (with filtering for what the user is allowed to see)
export const getAllAnnouncements = async (req, res) => {
  const organizationId = getOrgId(req);
  const user = req.user || {};

  if (!organizationId)
    return handleError(
      res,
      400,
      "organizationId is required",
      null,
      "getAllAnnouncements",
    );

  try {
    const memberId = await resolveMemberId(organizationId, user);
    if (!memberId)
      return handleError(
        res,
        403,
        "Not a member of this organization",
        null,
        "getAllAnnouncements",
      );

    // Fetch member role ONLY (removed department/team since they don't exist in schema)
    const memberRes = await pool.query(
      `SELECT role FROM organization_members WHERE id = $1`,
      [memberId],
    );
    const member = memberRes.rows[0];

    const { search, status } = req.query;

    // Base query: must be in the same org
    let conditions = ["a.organization_id = $1"];
    let values = [organizationId];
    let idx = 2;

    if (status && status !== "all") {
      conditions.push(`a.status = $${idx++}`);
      values.push(status);
    } else {
      conditions.push(`a.status = 'Active'`); // By default, only show active
    }

    if (search) {
      conditions.push(`(a.title ILIKE $${idx} OR a.description ILIKE $${idx})`);
      values.push(`%${search}%`);
      idx++;
    }

    // Recipient visibility logic:
    // Show if:
    // 1. User is owner/admin (can see all)
    // 2. Recipient type is Entire Organization
    // 3. Recipient type is Individual and user's ID is in target_member_ids
    // 4. User created it
    // (NOTE: Department and Team logic are temporarily bypassed because those columns are not in the schema)
    if (member.role !== "owner" && member.role !== "admin") {
      conditions.push(`
        (
          a.recipient_type = 'Entire Organization' OR
          (a.recipient_type = 'Individual Employees' AND a.target_member_ids ? $${idx}) OR
          a.created_by = $${idx + 1}
        )
      `);
      values.push(memberId, memberId);
      idx += 2;
    }

    const result = await pool.query(
      `SELECT a.*, creator.name AS created_by_name, creator.email AS created_by_email
       FROM announcements a
       LEFT JOIN organization_members creator ON creator.id = a.created_by
       WHERE ${conditions.join(" AND ")}
       ORDER BY a.created_at DESC`,
      values,
    );

    return handleSuccess(
      res,
      200,
      "Announcements fetched",
      result.rows,
      "getAllAnnouncements",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "getAllAnnouncements");
  }
};
// UPDATE
export const updateAnnouncement = async (req, res) => {
  const organizationId = getOrgId(req);
  const { id } = req.params;

  if (!organizationId)
    return handleError(
      res,
      400,
      "organizationId is required",
      null,
      "updateAnnouncement",
    );

  try {
    const {
      title,
      description,
      type,
      recipient_type,
      target_department,
      target_team_id,
      target_member_ids,
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
    setField("type", type);
    setField("recipient_type", recipient_type);
    setField("target_department", target_department);
    setField("target_team_id", target_team_id);
    if (target_member_ids !== undefined) {
      fields.push(`target_member_ids = $${idx++}`);
      values.push(JSON.stringify(target_member_ids));
    }

    if (fields.length === 0)
      return handleError(
        res,
        400,
        "No fields to update",
        null,
        "updateAnnouncement",
      );

    values.push(id, organizationId);
    const result = await pool.query(
      `UPDATE announcements SET ${fields.join(", ")} 
       WHERE id = $${idx++} AND organization_id = $${idx} RETURNING *`,
      values,
    );

    if (result.rows.length === 0)
      return handleError(
        res,
        404,
        "Announcement not found",
        null,
        "updateAnnouncement",
      );

    return handleSuccess(
      res,
      200,
      "Announcement updated",
      result.rows[0],
      "updateAnnouncement",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "updateAnnouncement");
  }
};

// DELETE
export const deleteAnnouncement = async (req, res) => {
  const organizationId = getOrgId(req);
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM announcements WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, organizationId],
    );
    if (result.rows.length === 0)
      return handleError(res, 404, "Not found", null, "deleteAnnouncement");
    return handleSuccess(
      res,
      200,
      "Deleted successfully",
      { id },
      "deleteAnnouncement",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "deleteAnnouncement");
  }
};

// ARCHIVE (Soft Delete)
export const archiveAnnouncement = async (req, res) => {
  const organizationId = getOrgId(req);
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE announcements SET status = 'Archived' 
       WHERE id = $1 AND organization_id = $2 RETURNING *`,
      [id, organizationId],
    );
    if (result.rows.length === 0)
      return handleError(res, 404, "Not found", null, "archiveAnnouncement");
    return handleSuccess(
      res,
      200,
      "Archived successfully",
      result.rows[0],
      "archiveAnnouncement",
    );
  } catch (error) {
    return handleError(res, 500, error.message, error, "archiveAnnouncement");
  }
};
