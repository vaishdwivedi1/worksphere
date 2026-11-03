import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

/* ==================== LEAVE TYPES ==================== */

export const createLeaveType = async (req, res) => {
  const fn = "createLeaveType";
  try {
    const {
      organization_id,
      name,
      description,
      max_days_per_year,
      carry_forward_allowed,
      is_paid,
      requires_approval,
      is_active,
    } = req.body;

    if (!organization_id || !name) {
      return handleError(
        res,
        400,
        "organization_id and name are required",
        null,
        fn,
      );
    }

    const result = await pool.query(
      `INSERT INTO leave_types
        (organization_id, name, description, max_days_per_year, carry_forward_allowed, is_paid, requires_approval, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        organization_id,
        name,
        description || null,
        max_days_per_year || 0,
        carry_forward_allowed ?? false,
        is_paid ?? true,
        requires_approval ?? true,
        is_active ?? true,
      ],
    );

    return handleSuccess(
      res,
      201,
      "Leave type created successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    if (error.code === "23505") {
      return handleError(res, 409, "Leave type already exists", error, fn);
    }
    return handleError(res, 500, "Failed to create leave type", error, fn);
  }
};

export const getAllLeaveTypes = async (req, res) => {
  const fn = "getAllLeaveTypes";
  try {
    const { orgId, active_only } = req.query;

    if (!orgId) {
      return handleError(res, 400, "orgId is required", null, fn);
    }

    let query = `SELECT * FROM leave_types WHERE organization_id = $1`;
    const params = [orgId];
    if (active_only === "true") query += ` AND is_active = TRUE`;
    query += ` ORDER BY name ASC`;

    const result = await pool.query(query, params);
    return handleSuccess(
      res,
      200,
      "Leave types fetched successfully",
      result.rows,
      fn,
    );
  } catch (error) {
    return handleError(res, 500, "Failed to fetch leave types", error, fn);
  }
};

export const getLeaveTypeById = async (req, res) => {
  const fn = "getLeaveTypeById";
  try {
    const { id } = req.params;
    const result = await pool.query(`SELECT * FROM leave_types WHERE id = $1`, [
      id,
    ]);
    if (result.rows.length === 0) {
      return handleError(res, 404, "Leave type not found", null, fn);
    }
    return handleSuccess(
      res,
      200,
      "Leave type fetched successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    return handleError(res, 500, "Failed to fetch leave type", error, fn);
  }
};

export const updateLeaveType = async (req, res) => {
  const fn = "updateLeaveType";
  try {
    const { id } = req.params;
    const {
      name,
      description,
      max_days_per_year,
      carry_forward_allowed,
      is_paid,
      requires_approval,
      is_active,
    } = req.body;

    const result = await pool.query(
      `UPDATE leave_types SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        max_days_per_year = COALESCE($3, max_days_per_year),
        carry_forward_allowed = COALESCE($4, carry_forward_allowed),
        is_paid = COALESCE($5, is_paid),
        requires_approval = COALESCE($6, requires_approval),
        is_active = COALESCE($7, is_active)
       WHERE id = $8 RETURNING *`,
      [
        name,
        description,
        max_days_per_year,
        carry_forward_allowed,
        is_paid,
        requires_approval,
        is_active,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return handleError(res, 404, "Leave type not found", null, fn);
    }
    return handleSuccess(
      res,
      200,
      "Leave type updated successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    return handleError(res, 500, "Failed to update leave type", error, fn);
  }
};

export const deleteLeaveType = async (req, res) => {
  const fn = "deleteLeaveType";
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM leave_types WHERE id = $1 RETURNING *`,
      [id],
    );
    if (result.rows.length === 0) {
      return handleError(res, 404, "Leave type not found", null, fn);
    }
    return handleSuccess(
      res,
      200,
      "Leave type deleted successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    if (error.code === "23503") {
      return handleError(
        res,
        409,
        "Cannot delete leave type in use by existing requests",
        error,
        fn,
      );
    }
    return handleError(res, 500, "Failed to delete leave type", error, fn);
  }
};

/* ==================== LEAVES ==================== */

export const applyLeave = async (req, res) => {
  const fn = "applyLeave";
  const client = await pool.connect();
  try {
    const {
      organization_id,
      employee_id,
      leave_type_id,
      start_date,
      end_date,
      is_half_day,
      half_day_session,
      is_wfh,
      reason,
      attachments,
    } = req.body;

    if (
      !organization_id ||
      !employee_id ||
      !leave_type_id ||
      !start_date ||
      !end_date ||
      !reason
    ) {
      return handleError(res, 400, "Missing required fields", null, fn);
    }

    const memberCheck = await client.query(
      `SELECT id FROM organization_members
       WHERE organization_id = $1 AND (user_id = $2 OR id = $2)
       LIMIT 1`,
      [organization_id, employee_id],
    );

    if (memberCheck.rows.length === 0) {
      return handleError(
        res,
        400,
        "Employee record not found in this organization. Please re-login.",
        null,
        fn,
      );
    }

    const memberId = memberCheck.rows[0].id;

    const ltRes = await client.query(
      `SELECT * FROM leave_types
       WHERE id = $1 AND organization_id = $2 AND is_active = TRUE`,
      [leave_type_id, organization_id],
    );
    if (ltRes.rows.length === 0) {
      return handleError(res, 400, "Invalid or inactive leave type", null, fn);
    }

    const start = new Date(start_date);
    const end = new Date(end_date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return handleError(res, 400, "Invalid date format", null, fn);
    }
    if (end < start) {
      return handleError(res, 400, "end_date must be >= start_date", null, fn);
    }

    const diffMs = end.getTime() - start.getTime();
    let days = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (is_half_day) days = 0.5;

    const overlap = await client.query(
      `SELECT id FROM leaves
       WHERE employee_id = $1
         AND status IN ('Pending','Approved')
         AND (start_date <= $3 AND end_date >= $2)`,
      [memberId, start_date, end_date],
    );
    if (overlap.rows.length > 0) {
      return handleError(
        res,
        409,
        "Overlapping leave request already exists",
        null,
        fn,
      );
    }

    let normalizedHalfDaySession = null;
    if (is_half_day && half_day_session) {
      const s = String(half_day_session).trim();
      if (s === "Morning" || s === "AM") normalizedHalfDaySession = "AM";
      else if (s === "Afternoon" || s === "PM") normalizedHalfDaySession = "PM";
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO leaves
        (organization_id, employee_id, leave_type_id, start_date, end_date,
         number_of_days, is_half_day, half_day_session, is_wfh, reason, status, attachments)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Pending',$11)
       RETURNING *`,
      [
        organization_id,
        memberId,
        leave_type_id,
        start_date,
        end_date,
        days,
        is_half_day ?? false,
        normalizedHalfDaySession,
        is_wfh ?? false,
        reason,
        JSON.stringify(attachments || []),
      ],
    );

    await client.query("COMMIT");
    return handleSuccess(
      res,
      201,
      "Leave request submitted successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rbErr) {
      console.error("[applyLeave] rollback failed:", rbErr);
    }

    console.error("[applyLeave] ERROR:", error);

    if (error.code === "23503") {
      if (error.constraint === "leaves_employee_id_fkey") {
        return handleError(
          res,
          400,
          "Invalid employee reference. Please re-login and try again.",
          null,
          fn,
        );
      }
      if (error.constraint === "leaves_leave_type_id_fkey") {
        return handleError(res, 400, "Invalid leave type", null, fn);
      }
      if (error.constraint === "leaves_organization_id_fkey") {
        return handleError(res, 400, "Invalid organization", null, fn);
      }
      return handleError(res, 400, "Invalid reference in request", null, fn);
    }

    if (error.code === "23514") {
      return handleError(
        res,
        400,
        `Validation failed: ${error.constraint || "check constraint"}`,
        null,
        fn,
      );
    }

    if (error.code === "22P02") {
      return handleError(res, 400, "Invalid input format", null, fn);
    }

    return handleError(res, 500, "Failed to apply leave", error, fn);
  } finally {
    client.release();
  }
};

export const getAllLeaves = async (req, res) => {
  const fn = "getAllLeaves";
  try {
    const {
      orgId,
      employeeId,
      department,
      leaveTypeId,
      status,
      startDate,
      endDate,
      appliedDate,
      dayType,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    if (!orgId) {
      return handleError(res, 400, "orgId is required", null, fn);
    }

    const conditions = [`l.organization_id = $1`];
    const params = [orgId];
    let idx = 2;

    if (employeeId) {
      conditions.push(
        `l.employee_id = (
           SELECT id FROM organization_members
           WHERE organization_id = $1 AND user_id = $${idx}
           LIMIT 1
         )`,
      );
      params.push(employeeId);
      idx++;
    }
    if (leaveTypeId) {
      conditions.push(`l.leave_type_id = $${idx++}`);
      params.push(leaveTypeId);
    }
    if (status) {
      conditions.push(`l.status = ANY($${idx++})`);
      params.push(status.split(","));
    }
    if (startDate) {
      conditions.push(`l.start_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`l.end_date <= $${idx++}`);
      params.push(endDate);
    }
    if (appliedDate) {
      conditions.push(`DATE(l.applied_date) = $${idx++}`);
      params.push(appliedDate);
    }
    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (department) {
      conditions.push(`om.department = $${idx++}`);
      params.push(department);
    }

    if (dayType === "Half Day") conditions.push(`l.is_half_day = TRUE`);
    if (dayType === "Full Day") conditions.push(`l.is_half_day = FALSE`);
    if (dayType === "WFH") conditions.push(`l.is_wfh = TRUE`);
    if (dayType === "Multiple Days") conditions.push(`l.number_of_days > 1`);

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const baseQuery = `
      FROM leaves l
      JOIN organization_members om ON om.id = l.employee_id
      LEFT JOIN users u ON u.id = om.user_id
      JOIN leave_types lt ON lt.id = l.leave_type_id
      WHERE ${conditions.join(" AND ")}
    `;

    const dataQuery = `
      SELECT l.*,
             lt.name AS leave_type_name,
             lt.is_paid,
             om.email AS employee_email,
             om.role AS employee_role,
             u.name AS employee_name,
             u.profile_picture AS employee_avatar
      ${baseQuery}
      ORDER BY l.applied_date DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const countQuery = `SELECT COUNT(*) ${baseQuery}`;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, [...params, limit, offset]),
      pool.query(countQuery, params),
    ]);

    // return res.status(200).json({
    //   success: true,
    //   statusCode: 200,
    //   message: "Leaves fetched successfully",
    //   data: dataRes.rows,
    //   pagination: {
    //     total: parseInt(countRes.rows[0].count),
    //     page: parseInt(page),
    //     limit: parseInt(limit),
    //     totalPages: Math.ceil(countRes.rows[0].count / limit),
    //   },
    //   timestamp: new Date().toISOString(),
    // });

    return handleSuccess(
      res,
      200,
      "Leaves fetched successfully",
      {
        leaves: dataRes.rows,
        pagination: {
          total: parseInt(countRes.rows[0].count),
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countRes.rows[0].count / limit),
        },
      },
      fn,
    );
  } catch (error) {
    return handleError(res, 500, "Failed to fetch leaves", error, fn);
  }
};

export const getLeaveById = async (req, res) => {
  const fn = "getLeaveById";
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT l.*,
              lt.name AS leave_type_name,
              lt.is_paid,
              om.email AS employee_email,
              u.name AS employee_name,
              ab.name AS approved_by_name,
              rb.name AS rejected_by_name
       FROM leaves l
       JOIN leave_types lt ON lt.id = l.leave_type_id
       JOIN organization_members om ON om.id = l.employee_id
       LEFT JOIN users u ON u.id = om.user_id
       LEFT JOIN organization_members abm ON abm.id = l.approved_by
       LEFT JOIN users ab ON ab.id = abm.user_id
       LEFT JOIN organization_members rbm ON rbm.id = l.rejected_by
       LEFT JOIN users rb ON rb.id = rbm.user_id
       WHERE l.id = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return handleError(res, 404, "Leave not found", null, fn);
    }
    return handleSuccess(
      res,
      200,
      "Leave fetched successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    return handleError(res, 500, "Failed to fetch leave", error, fn);
  }
};

const actionLeave = async (req, res, action) => {
  const fn = `${action}Leave`;
  try {
    const { id } = req.params;
    const { member_id, comment } = req.body;

    let resolvedMemberId = null;
    if (action !== "cancel" && member_id) {
      const resolve = await pool.query(
        `SELECT om.id
         FROM organization_members om
         JOIN leaves l ON l.organization_id = om.organization_id
         WHERE l.id = $1
           AND (om.id = $2 OR om.user_id = $2)
         LIMIT 1`,
        [id, member_id],
      );
      if (resolve.rows.length === 0) {
        return handleError(
          res,
          400,
          "Invalid approver member. Please re-login.",
          null,
          fn,
        );
      }
      resolvedMemberId = resolve.rows[0].id;
    }

    let updateCol = "";
    let statusVal = "";
    if (action === "approve") {
      updateCol = "approved_by = $2";
      statusVal = "Approved";
    } else if (action === "reject") {
      updateCol = "rejected_by = $2";
      statusVal = "Rejected";
    } else {
      statusVal = "Cancelled";
    }

    const query =
      action === "cancel"
        ? `UPDATE leaves SET status = 'Cancelled',
             approval_comment = COALESCE($3, approval_comment),
             actioned_at = NOW()
           WHERE id = $1 AND status = 'Pending' RETURNING *`
        : `UPDATE leaves SET status = '${statusVal}', ${updateCol},
             approval_comment = COALESCE($3, approval_comment),
             actioned_at = NOW()
           WHERE id = $1 AND status = 'Pending' RETURNING *`;

    const params =
      action === "cancel"
        ? [id, null, comment || null]
        : [id, resolvedMemberId, comment || null];

    const result = await pool.query(query, params);
    if (result.rows.length === 0) {
      return handleError(
        res,
        404,
        "Leave not found or already actioned",
        null,
        fn,
      );
    }

    const messages = {
      approve: "Leave approved successfully",
      reject: "Leave rejected successfully",
      cancel: "Leave cancelled successfully",
    };
    return handleSuccess(res, 200, messages[action], result.rows[0], fn);
  } catch (error) {
    if (error.code === "23503") {
      return handleError(
        res,
        400,
        "Invalid approver member. Please re-login.",
        null,
        fn,
      );
    }
    return handleError(res, 500, `Failed to ${action} leave`, error, fn);
  }
};

export const approveLeave = (req, res) => actionLeave(req, res, "approve");
export const rejectLeave = (req, res) => actionLeave(req, res, "reject");
export const cancelLeave = (req, res) => actionLeave(req, res, "cancel");

export const updateLeave = async (req, res) => {
  const fn = "updateLeave";
  try {
    const { id } = req.params;
    const {
      start_date,
      end_date,
      leave_type_id,
      reason,
      is_half_day,
      half_day_session,
      is_wfh,
      attachments,
    } = req.body;

    const days = (() => {
      if (!start_date || !end_date) return null;
      if (is_half_day) return 0.5;
      const s = new Date(start_date);
      const e = new Date(end_date);
      return Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
    })();

    let normalizedHalfDaySession = null;
    if (is_half_day && half_day_session) {
      const s = String(half_day_session).trim();
      if (s === "Morning" || s === "AM") normalizedHalfDaySession = "AM";
      else if (s === "Afternoon" || s === "PM") normalizedHalfDaySession = "PM";
    }

    const result = await pool.query(
      `UPDATE leaves SET
        start_date = COALESCE($1, start_date),
        end_date = COALESCE($2, end_date),
        leave_type_id = COALESCE($3, leave_type_id),
        reason = COALESCE($4, reason),
        is_half_day = COALESCE($5, is_half_day),
        half_day_session = COALESCE($6, half_day_session),
        is_wfh = COALESCE($7, is_wfh),
        attachments = COALESCE($8, attachments),
        number_of_days = COALESCE($9, number_of_days)
       WHERE id = $10 AND status = 'Pending' RETURNING *`,
      [
        start_date,
        end_date,
        leave_type_id,
        reason,
        is_half_day,
        normalizedHalfDaySession,
        is_wfh,
        attachments ? JSON.stringify(attachments) : null,
        days,
        id,
      ],
    );

    if (result.rows.length === 0) {
      return handleError(
        res,
        404,
        "Leave not found or not editable (only Pending)",
        null,
        fn,
      );
    }
    return handleSuccess(
      res,
      200,
      "Leave updated successfully",
      result.rows[0],
      fn,
    );
  } catch (error) {
    if (error.code === "23514") {
      return handleError(
        res,
        400,
        `Validation failed: ${error.constraint || "check constraint"}`,
        null,
        fn,
      );
    }
    return handleError(res, 500, "Failed to update leave", error, fn);
  }
};
