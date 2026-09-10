import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import pool from "../config/postgres.js";

// ============================================
// GET ALL TEAMS OF AN ORG
// ============================================
export const getTeams = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return handleError(res, 400, "Invalid org id", {}, "getTeams");
    }

    const isOrgCheck = await pool.query(
      `SELECT 1 FROM organizations WHERE id = $1`,
      [orgId],
    );

    if (isOrgCheck.rows.length === 0) {
      return handleError(res, 404, "Organization not found", {}, "getTeams");
    }

    const teams = await pool.query(
      `SELECT
          t.id,
          t.name,
          t.description,
          t.is_predefined,
          t.predefined_type,
          t.is_active,
          ot.member_count
       FROM organization_teams ot
       JOIN teams t ON t.id = ot.team_id
       WHERE ot.organization_id = $1
         AND t.is_active = TRUE
       ORDER BY t.is_predefined DESC, t.name`,
      [orgId],
    );

    console.log(teams);

    return handleSuccess(
      res,
      200,
      "All teams fetched successfully",
      teams.rows,
      "getTeams",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "getTeams",
    );
  }
};

// ============================================
// GET SINGLE TEAM + ITS MEMBERS
// ============================================
export const getTeamById = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;

    if (!orgId || !teamId) {
      return handleError(
        res,
        400,
        "Invalid org id or team id",
        {},
        "getTeamById",
      );
    }

    const isOrgCheck = await pool.query(
      `SELECT 1 FROM organizations WHERE id = $1`,
      [orgId],
    );
    if (isOrgCheck.rows.length === 0) {
      return handleError(res, 404, "Organization not found", {}, "getTeamById");
    }

    const teamResult = await pool.query(
      `SELECT
          t.id,
          t.name,
          t.description,
          t.is_predefined,
          t.predefined_type,
          t.is_active,
          t.created_at,
          t.updated_at,
          ot.member_count
       FROM organization_teams ot
       JOIN teams t ON t.id = ot.team_id
       WHERE ot.organization_id = $1
         AND ot.team_id = $2`,
      [orgId, teamId],
    );

    if (teamResult.rows.length === 0) {
      return handleError(res, 404, "Team not found", {}, "getTeamById");
    }

    const membersResult = await pool.query(
      `SELECT
          om.id,
          om.name,
          om.email,
          om.role,
          om.department,
          om.status,
          tm.joined_at
       FROM team_members tm
       JOIN organization_members om ON om.id = tm.member_id
       WHERE tm.team_id = $1
         AND om.organization_id = $2
       ORDER BY tm.joined_at DESC`,
      [teamId, orgId],
    );

    const team = teamResult.rows[0];
    team.members = membersResult.rows;

    return handleSuccess(
      res,
      200,
      "Team fetched successfully",
      team,
      "getTeamById",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "getTeamById",
    );
  }
};

// ============================================
// CREATE CUSTOM TEAM (only PRO/PREMIUM)
// ============================================
export const createTeam = async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, description, orgId } = req.body;

    if (!orgId) {
      return handleError(res, 400, "Invalid org id", {}, "createTeam");
    }

    if (!name || !name.trim()) {
      return handleError(res, 400, "Team name is required", {}, "createTeam");
    }

    // Org check + plan check
    const orgCheck = await pool.query(
      `SELECT id, plan FROM organizations WHERE id = $1`,
      [orgId],
    );

    if (orgCheck.rows.length === 0) {
      return handleError(res, 404, "Organization not found", {}, "createTeam");
    }

    const orgPlan = orgCheck.rows[0].plan;
    // if (orgPlan === "FREE") {
    //   return handleError(
    //     res,
    //     403,
    //     "Custom teams are only available for PRO and PREMIUM plans",
    //     {},
    //     "createTeam",
    //   );
    // }

    // Same name ki custom team already exist karti hai?
    const dupCheck = await pool.query(
      `SELECT t.id
       FROM teams t
       JOIN organization_teams ot ON ot.team_id = t.id
       WHERE ot.organization_id = $1
         AND t.is_predefined = FALSE
         AND LOWER(t.name) = LOWER($2)`,
      [orgId, name.trim()],
    );

    if (dupCheck.rows.length > 0) {
      return handleError(
        res,
        409,
        "A custom team with this name already exists in this organization",
        {},
        "createTeam",
      );
    }

    await client.query("BEGIN");

    // 1. teams table mein insert (is_predefined = false)
    const teamResult = await client.query(
      `INSERT INTO teams (name, description, is_predefined, is_active)
       VALUES ($1, $2, FALSE, TRUE)
       RETURNING id, name, description, is_predefined, predefined_type, is_active, created_at, updated_at`,
      [name.trim(), description || null],
    );

    const newTeam = teamResult.rows[0];

    // 2. organization_teams mein link karo (member_count = 0)
    await client.query(
      `INSERT INTO organization_teams (organization_id, team_id, member_count)
       VALUES ($1, $2, 0)`,
      [orgId, newTeam.id],
    );

    await client.query("COMMIT");

    return handleSuccess(
      res,
      201,
      "Team created successfully",
      { ...newTeam, member_count: 0 },
      "createTeam",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "createTeam",
    );
  } finally {
    client.release();
  }
};

// ============================================
// UPDATE TEAM (only custom teams can be updated)
// ============================================
export const updateTeam = async (req, res) => {
  try {
    const { name, description, is_active, orgId, teamId } = req.body;

    if (!orgId || !teamId) {
      return handleError(
        res,
        400,
        "Invalid org id or team id",
        {},
        "updateTeam",
      );
    }

    if (!name && description === undefined && is_active === undefined) {
      return handleError(
        res,
        400,
        "Nothing to update. Provide name, description, or is_active",
        {},
        "updateTeam",
      );
    }

    // Team is org ke andar exist karti hai?
    const teamCheck = await pool.query(
      `SELECT t.id, t.is_predefined, t.name
       FROM organization_teams ot
       JOIN teams t ON t.id = ot.team_id
       WHERE ot.organization_id = $1
         AND ot.team_id = $2`,
      [orgId, teamId],
    );

    if (teamCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Team not found in this org",
        {},
        "updateTeam",
      );
    }

    // Predefined teams ko edit nahi kar sakte
    if (teamCheck.rows[0].is_predefined) {
      return handleError(
        res,
        403,
        "Predefined teams cannot be modified",
        {},
        "updateTeam",
      );
    }

    // Name duplicate check (agar name change ho raha hai)
    if (name && name.trim() !== teamCheck.rows[0].name) {
      const dupCheck = await pool.query(
        `SELECT t.id
         FROM teams t
         JOIN organization_teams ot ON ot.team_id = t.id
         WHERE ot.organization_id = $1
           AND t.is_predefined = FALSE
           AND t.id <> $2
           AND LOWER(t.name) = LOWER($3)`,
        [orgId, teamId, name.trim()],
      );

      if (dupCheck.rows.length > 0) {
        return handleError(
          res,
          409,
          "Another custom team with this name already exists",
          {},
          "updateTeam",
        );
      }
    }

    // Dynamic update query banao (sirf jo fields bheje hain wahi update karo)
    const updates = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      updates.push(`name = $${idx++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${idx++}`);
      values.push(description);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(teamId);

    const updateResult = await pool.query(
      `UPDATE teams
       SET ${updates.join(", ")}
       WHERE id = $${idx}
       RETURNING id, name, description, is_predefined, predefined_type, is_active, created_at, updated_at`,
      values,
    );

    return handleSuccess(
      res,
      200,
      "Team updated successfully",
      updateResult.rows[0],
      "updateTeam",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "updateTeam",
    );
  }
};

// ============================================
// DELETE TEAM (only custom teams, only if no members)
// ============================================
export const deleteTeam = async (req, res) => {
  const client = await pool.connect();
  try {
    const { orgId, teamId } = req.params;

    if (!orgId || !teamId) {
      return handleError(
        res,
        400,
        "Invalid org id or team id",
        {},
        "deleteTeam",
      );
    }

    const teamCheck = await pool.query(
      `SELECT t.id, t.is_predefined, t.name, ot.member_count
       FROM organization_teams ot
       JOIN teams t ON t.id = ot.team_id
       WHERE ot.organization_id = $1
         AND ot.team_id = $2`,
      [orgId, teamId],
    );

    if (teamCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Team not found in this org",
        {},
        "deleteTeam",
      );
    }

    if (teamCheck.rows[0].is_predefined) {
      return handleError(
        res,
        403,
        "Predefined teams cannot be deleted",
        {},
        "deleteTeam",
      );
    }

    // Agar team mein members hain toh pehle unhe hatao ya block karo
    if (teamCheck.rows[0].member_count > 0) {
      return handleError(
        res,
        409,
        "Cannot delete a team that has members. Remove members first.",
        {},
        "deleteTeam",
      );
    }

    await client.query("BEGIN");

    // organization_teams link delete (CASCADE se teams se bhi hat jayega, par explicit karo)
    await client.query(
      `DELETE FROM organization_teams
       WHERE organization_id = $1 AND team_id = $2`,
      [orgId, teamId],
    );

    // teams row delete (agar koi aur org isko use nahi kar raha)
    const stillLinked = await client.query(
      `SELECT 1 FROM organization_teams WHERE team_id = $1 LIMIT 1`,
      [teamId],
    );

    if (stillLinked.rows.length === 0) {
      await client.query(`DELETE FROM teams WHERE id = $1`, [teamId]);
    }

    await client.query("COMMIT");

    return handleSuccess(
      res,
      200,
      "Team deleted successfully",
      { id: teamId },
      "deleteTeam",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "deleteTeam",
    );
  } finally {
    client.release();
  }
};

// ============================================
// GET TEAM MEMBERS (only members list)
// ============================================
export const getTeamMembers = async (req, res) => {
  try {
    const { orgId, teamId } = req.params;

    if (!orgId || !teamId) {
      return handleError(
        res,
        400,
        "Invalid org id or team id",
        {},
        "getTeamMembers",
      );
    }

    // Team exist karti hai is org mein?
    const teamCheck = await pool.query(
      `SELECT 1 FROM organization_teams
       WHERE organization_id = $1 AND team_id = $2`,
      [orgId, teamId],
    );

    if (teamCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Team not found in this org",
        {},
        "getTeamMembers",
      );
    }

    const members = await pool.query(
      `SELECT
          om.id,
          om.name,
          om.email,
          om.role,
          om.department,
          om.status,
          tm.joined_at
       FROM team_members tm
       JOIN organization_members om ON om.id = tm.member_id
       WHERE tm.team_id = $1
         AND om.organization_id = $2
       ORDER BY tm.joined_at DESC`,
      [teamId, orgId],
    );

    return handleSuccess(
      res,
      200,
      "Team members fetched successfully",
      members.rows,
      "getTeamMembers",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "getTeamMembers",
    );
  }
};

// ============================================
// ADD MEMBER TO TEAM
// ============================================
export const addTeamMember = async (req, res) => {
  const client = await pool.connect();
  try {
    const { memberIds, orgId, teamId } = req.body; // array from frontend

    if (!orgId || !teamId) {
      return handleError(
        res,
        400,
        "Invalid org id or team id",
        {},
        "addTeamMember",
      );
    }

    // Normalize: single id bhi accept karo, array bhi
    const ids = Array.isArray(memberIds)
      ? memberIds
      : memberIds
        ? [memberIds]
        : [];

    if (ids.length === 0) {
      return handleError(
        res,
        400,
        "At least one memberId is required",
        {},
        "addTeamMember",
      );
    }

    // Duplicates hatao
    const uniqueIds = [...new Set(ids)];

    // Team is org ke andar hai?
    const teamCheck = await pool.query(
      `SELECT 1 FROM organization_teams
       WHERE organization_id = $1 AND team_id = $2`,
      [orgId, teamId],
    );

    if (teamCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Team not found in this org",
        {},
        "addTeamMember",
      );
    }

    // Saare members ek query mein fetch karo (org filter)
    const memberCheck = await pool.query(
      `SELECT id, name, email, status
       FROM organization_members
       WHERE id = ANY($1::uuid[])
         AND organization_id = $2`,
      [uniqueIds, orgId],
    );

    // Missing members?
    const foundIds = new Set(memberCheck.rows.map((r) => r.id));
    const missing = uniqueIds.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return handleError(
        res,
        404,
        `Some members not found in this organization: ${missing.join(", ")}`,
        {},
        "addTeamMember",
      );
    }

    // Inactive members?
    const inactive = memberCheck.rows.filter((m) => m.status !== "active");
    if (inactive.length > 0) {
      return handleError(
        res,
        400,
        `Only active members can be added. Inactive: ${inactive
          .map((m) => m.email)
          .join(", ")}`,
        {},
        "addTeamMember",
      );
    }

    // Already part of team?
    const alreadyCheck = await pool.query(
      `SELECT member_id FROM team_members
       WHERE team_id = $1 AND member_id = ANY($2::uuid[])`,
      [teamId, uniqueIds],
    );

    if (alreadyCheck.rows.length > 0) {
      const alreadyIds = alreadyCheck.rows.map((r) => r.member_id);
      return handleError(
        res,
        409,
        `Some members are already part of this team: ${alreadyIds.join(", ")}`,
        {},
        "addTeamMember",
      );
    }

    await client.query("BEGIN");

    // Bulk insert — unnest use karo
    await client.query(
      `INSERT INTO team_members (team_id, member_id)
       SELECT $1, unnest($2::uuid[])`,
      [teamId, uniqueIds],
    );

    // Note: member_count trigger automatically update karega (per-row insert)

    await client.query("COMMIT");

    return handleSuccess(
      res,
      201,
      `${uniqueIds.length} member(s) added to team successfully`,
      {
        team_id: teamId,
        added_count: uniqueIds.length,
        members: memberCheck.rows.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        })),
      },
      "addTeamMember",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "addTeamMember",
    );
  } finally {
    client.release();
  }
};

// ============================================
// REMOVE MEMBER FROM TEAM
// ============================================
export const removeTeamMember = async (req, res) => {
  try {
    const { orgId, teamId, memberId } = req.params;

    if (!orgId || !teamId || !memberId) {
      return handleError(
        res,
        400,
        "Invalid org id, team id, or member id",
        {},
        "removeTeamMember",
      );
    }

    // Team is org ke andar hai?
    const teamCheck = await pool.query(
      `SELECT 1 FROM organization_teams
       WHERE organization_id = $1 AND team_id = $2`,
      [orgId, teamId],
    );

    if (teamCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Team not found in this org",
        {},
        "removeTeamMember",
      );
    }

    // Member is org ka hai?
    const memberCheck = await pool.query(
      `SELECT 1 FROM organization_members
       WHERE id = $1 AND organization_id = $2`,
      [memberId, orgId],
    );

    if (memberCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Member not found in this organization",
        {},
        "removeTeamMember",
      );
    }

    const deleteResult = await pool.query(
      `DELETE FROM team_members
       WHERE team_id = $1 AND member_id = $2
       RETURNING id`,
      [teamId, memberId],
    );

    if (deleteResult.rows.length === 0) {
      return handleError(
        res,
        404,
        "Member is not part of this team",
        {},
        "removeTeamMember",
      );
    }

    // member_count trigger se automatically decrement ho jayega

    return handleSuccess(
      res,
      200,
      "Member removed from team successfully",
      { team_id: teamId, member_id: memberId },
      "removeTeamMember",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "removeTeamMember",
    );
  }
};
