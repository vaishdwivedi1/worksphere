import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import { sendEmailMessage } from "../commonFunctions/otp.js";
import { isValidEmail, isValidMobile } from "../commonFunctions/regex.js";
import pool from "../config/postgres.js";
import crypto from "crypto";

export const getAllMember = async (req, res) => {
  // ============================================
  // STEP 1: Extract query parameters
  // Extract: search, role, status, department, page, limit from req.query
  // Defaults: page=1, limit=10 if not provided
  // ============================================

  const { searchText, role, status, department, page, limit } = req.query;
  const { orgId } = req.params;
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;
  const offset = (pageNum - 1) * limitNum;

  // STEP 2: Validate organization existence
  // Check if organization exists in database using orgId from req.user
  // Return 404 if not found

  if (!orgId) {
    return handleError(res, 400, "Invalid orgId", null, "getAllMember");
  }

  try {
    const orgCheck = await pool.query(
      "SELECT id FROM organizations WHERE id = $1",
      [orgId],
    );

    if (orgCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Organization not found",
        null,
        "getAllMember",
      );
    }

    // ============================================
    // STEP 3: Enable PostgreSQL extension (One-time setup)
    // ============================================
    // Run once in database: CREATE EXTENSION IF NOT EXISTS pg_trgm;
    // Enables trigram similarity matching for fuzzy search

    // ============================================
    // STEP 4: Create performance indexes (One-time setup)
    // Run these once for 10x faster fuzzy searches:
    // CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);
    // CREATE INDEX idx_om_email_trgm ON organization_members USING gin (email gin_trgm_ops);
    // ============================================

    // STEP 5: Build main query with all filters
    // SQL query structure:
    // SELECT u.*, om.* FROM users u
    // JOIN organization_members om ON u.id = om.user_id
    // WHERE om.organization_id = $1  -- Organization filter
    // AND ( -- Fuzzy search conditions (when searchText provided)
    //   $2 = '' OR
    //   u.name % $2 OR        -- Fuzzy match on name (highest priority)
    //   om.email % $2 OR      -- Fuzzy match on email
    //   u.phone % $2 OR       -- Fuzzy match on phone
    //   om.role % $2          -- Fuzzy match on role
    // )
    // AND ($3 = '' OR om.role = $3)           -- Role filter
    // AND ($4 = '' OR om.status = $4)         -- Status filter
    // AND ($5 = '' OR om.department = $5)     -- Department filter
    // ORDER BY
    //   CASE WHEN $2 != '' THEN similarity(u.name, $2) END DESC,  -- Relevance score
    //   om.created_at DESC                     -- Newest first
    // LIMIT $6 OFFSET $7                       -- Pagination
    // ============================================

    const mainQuery = `
      SELECT
        u.id AS user_id,
        u.name,
        u.email AS user_email,
        u.phone,
        u.profile_picture,
        u.is_active AS user_active,
        u.created_at AS user_created_at,
        om.id AS member_id,
        om.email AS member_email,
        om.role,
        om.status AS member_status,
        om.department,
        om.created_at AS joined_at,
        om.updated_at AS member_updated_at,
        om.invited_by,
        -- Calculate relevance score for sorting (higher = better match)
        CASE
          WHEN $2 != '' THEN
            GREATEST(
              COALESCE(similarity(u.name, $2), 0),
              COALESCE(similarity(om.email, $2), 0),
              COALESCE(similarity(u.phone, $2), 0),
              COALESCE(similarity(om.role, $2), 0)
            )
          ELSE 0
        END AS relevance_score
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.organization_id = $1
        -- Fuzzy search conditions (when searchText provided)
        AND (
          $2 = ''
          OR u.name % $2
          OR om.email % $2
          OR u.phone % $2
          OR om.role % $2
        )
        -- Role filter (exact match)
        AND ($3 = '' OR om.role = $3)
        -- Status filter (exact match)
        AND ($4 = '' OR om.status = $4)
        -- Department filter (exact match)
        AND ($5 = '' OR om.department = $5)
      ORDER BY
        -- Sort by relevance first (if search text provided)
        CASE
          WHEN $2 != '' THEN
            GREATEST(
              COALESCE(similarity(u.name, $2), 0),
              COALESCE(similarity(om.email, $2), 0),
              COALESCE(similarity(u.phone, $2), 0),
              COALESCE(similarity(om.role, $2), 0)
            )
          ELSE 0
        END DESC,
        -- Then by join date (newest first)
        om.created_at DESC
      LIMIT $6 OFFSET $7
    `;

    //     const mainQuery = `
    //   -- Set similarity threshold for better fuzzy matching
    //   SET pg_trgm.similarity_threshold = 0.1;

    //   SELECT
    //     u.id AS user_id,
    //     u.name,
    //     u.email AS user_email,
    //     u.phone,
    //     u.profile_picture,
    //     u.is_active AS user_active,
    //     u.created_at AS user_created_at,
    //     om.id AS member_id,
    //     om.email AS member_email,
    //     om.role,
    //     om.status AS member_status,
    //     om.department,
    //     om.created_at AS joined_at,
    //     om.updated_at AS member_updated_at,
    //     om.invited_by,
    //     CASE
    //       WHEN $2 != '' THEN
    //         GREATEST(
    //           COALESCE(similarity(u.name, $2), 0),
    //           COALESCE(similarity(om.email, $2), 0),
    //           COALESCE(similarity(u.phone, $2), 0),
    //           COALESCE(similarity(om.role, $2), 0)
    //         )
    //       ELSE 0
    //     END AS relevance_score
    //   FROM users u
    //   INNER JOIN organization_members om ON u.id = om.user_id
    //   WHERE om.organization_id = $1
    //     AND (
    //       $2 = ''
    //       OR u.name % $2
    //       OR om.email % $2
    //       OR u.phone % $2
    //       OR om.role % $2
    //     )
    //     AND ($3 = '' OR om.role = $3)
    //     AND ($4 = '' OR om.status = $4)
    //     AND ($5 = '' OR om.department = $5)
    //   ORDER BY
    //     CASE
    //       WHEN $2 != '' THEN
    //         GREATEST(
    //           COALESCE(similarity(u.name, $2), 0),
    //           COALESCE(similarity(om.email, $2), 0),
    //           COALESCE(similarity(u.phone, $2), 0),
    //           COALESCE(similarity(om.role, $2), 0)
    //         )
    //       ELSE 0
    //     END DESC,
    //     om.created_at DESC
    //   LIMIT $6 OFFSET $7
    // `;
    // STEP 6: Prepare parameterized values
    // Values array matching $1 through $7:
    // [organizationId, searchText, role, status, department, limit, offset]
    // offset = (page - 1) * limit

    const queryParams = [
      orgId, // $1 - Organization ID
      searchText || "", // $2 - Search text for fuzzy matching
      role || "", // $3 - Role filter
      status || "", // $4 - Status filter
      department || "", // $5 - Department filter
      limitNum, // $6 - LIMIT
      offset, // $7 - OFFSET
    ];

    // STEP 7: Execute main query
    // Run query with try-catch error handling
    // Store results in 'members' variable
    const membersResult = await pool.query(mainQuery, queryParams);
    const members = membersResult.rows;

    // STEP 8: Get total count for pagination
    // Same query as above but with COUNT(*) instead of SELECT *
    // Remove LIMIT and OFFSET clauses
    // Use same $1 through $5 parameters

    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.organization_id = $1
        AND (
          $2 = '' 
          OR u.name % $2 
          OR om.email % $2 
          OR u.phone % $2 
          OR om.role % $2  
        )
        AND ($3 = '' OR om.role = $3)
        AND ($4 = '' OR om.status = $4)
        AND ($5 = '' OR om.department = $5)
    `;

    // STEP 9: Execute count query
    // Run count query with try-catch
    // Store total count in 'total' variable

    const countResult = await pool.query(countQuery, queryParams.slice(0, 5));
    const total = parseInt(countResult.rows[0].total);

    // ============================================
    // STEP 10: Send paginated response

    const totalPages = Math.ceil(total / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // ============================================
    // Response structure:
    // {
    //   success: true,
    //   data: members,
    //   pagination: {
    //     page: currentPage,
    //     limit: itemsPerPage,
    //     total: totalCount,
    //     totalPages: Math.ceil(total / limit)
    //   }
    // }

    return handleSuccess(
      res,
      200,
      "Members fetched successfully",
      {
        members,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage,
        },
      },
      "getAllMember",
    );
  } catch (error) {
    console.error("Error in getAllMember:", error);
    return handleError(
      res,
      500,
      "Failed to retrieve members",
      error,
      "getAllMember",
    );
  }
};
export const addMember = async (req, res) => {
  const { orgId, memberEmail, memberPhone, memberRole, memberName, senderId } =
    req.body;

  if (!orgId || !memberEmail || !memberPhone || !memberName) {
    return handleError(res, 400, "Invalid payload", null, "addMember");
  }

  const orgCheck = await pool.query(
    "SELECT id FROM organizations WHERE id = $1",
    [orgId],
  );

  if (orgCheck.rows.length === 0) {
    return handleError(res, 404, "Organization not found", null, "addMember");
  }

  const isValidMemberEmail = isValidEmail(memberEmail);
  const isValidMemberPhone = isValidMobile(memberPhone);
  if (!isValidMemberEmail || !isValidMemberPhone) {
    return handleError(res, 400, "Invalid email or phone", null, "addMember");
  }

  try {
    // Check if user already exists in users table (by email or phone)
    const isUserExist = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      [memberEmail, memberPhone],
    );

    //  If user exists ANYWHERE, instantly return error
    if (isUserExist.rows.length > 0) {
      return handleError(
        res,
        400,
        "User already exists with this email or phone",
        null,
        "addMember",
      );
    }

    // User doesn't exist - create new user
    const userResult = await pool.query(
      `INSERT INTO users (email, phone, name, is_active, password_hash , created_at, updated_at)
       VALUES ($1, $2, $3, $4,$5 , NOW(), NOW()) 
       RETURNING id`,
      [memberEmail, memberPhone, memberName, false, memberPhone],
    );

    const userId = userResult.rows[0].id;

    // Add user to organization_members
    const orgMemRes = await pool.query(
      `INSERT INTO organization_members (
        organization_id,
        user_id,
        email,
        role,
        status,
        invited_by,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *`,
      [orgId, userId, memberEmail, memberRole, "pending", senderId],
    );

    return handleSuccess(
      res,
      200,
      "Member added successfully",
      orgMemRes.rows[0],
      "addMember",
    );
  } catch (error) {
    console.error("Error in addMember:", error);
    return handleError(res, 500, "Failed to add member", error, "addMember");
  }
};

export const generateMemberInvitationLink = async (req, res) => {
  const { orgId, memberEmail, memberPhone } = req.body;

  if (!orgId || !memberEmail) {
    return handleError(
      res,
      400,
      "Invalid payload",
      null,
      "generateMemberInvitationLink",
    );
  }

  // Check organization exists
  const orgCheck = await pool.query(
    "SELECT id FROM organizations WHERE id = $1",
    [orgId],
  );

  if (orgCheck.rows.length === 0) {
    return handleError(
      res,
      404,
      "Organization not found",
      null,
      "generateMemberInvitationLink",
    );
  }

  // Validate email and phone
  const isValidMemberEmail = isValidEmail(memberEmail);
  const isValidMemberPhone = isValidMobile(memberPhone);

  if (!isValidMemberEmail || !isValidMemberPhone) {
    return handleError(
      res,
      400,
      "Invalid email or phone",
      null,
      "generateMemberInvitationLink",
    );
  }

  try {
    // Check if user exists
    const userExists = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      [memberEmail, memberPhone],
    );

    if (userExists.rows.length === 0) {
      return handleError(
        res,
        404,
        "User does not exist with this email or phone. Please ask the user to register first.",
        null,
        "generateMemberInvitationLink",
      );
    }

    const userId = userExists.rows[0].id;

    // Check if user is already a member
    const userInOrg = await pool.query(
      `SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId],
    );

    if (userInOrg.rows.length === 0) {
      return handleError(
        res,
        400,
        "User is not a member of this organization",
        null,
        "generateMemberInvitationLink",
      );
    }

    if (userInOrg.rows[0].status === "active") {
      return handleError(
        res,
        400,
        "User is already an active member",
        null,
        "generateMemberInvitationLink",
      );
    }

    //  Generate invitation token
    const invitationToken = generateInvitationToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    //  SAVE TOKEN TO DATABASE (THIS WAS MISSING!)
    await pool.query(
      `UPDATE organization_members 
       SET invitation_token = $1,
           invitation_status = 'pending',
           invitation_expires_at = $2,
           invitation_sent_at = NOW(),
           updated_at = NOW()
       WHERE organization_id = $3 AND email = $4`,
      [invitationToken, expiresAt, orgId, memberEmail],
    );

    // Create link with token
    const link = `${process.env.FRONTENDURL}/accept-invitation?token=${invitationToken}&orgId=${orgId}&email=${memberEmail}`;

    // Send email
    await sendEmailMessage(memberEmail, link);

    console.log({ link });

    return handleSuccess(
      res,
      200,
      "Invitation link sent successfully",
      {
        email: memberEmail,
        orgId: orgId,
        link: link,
      },
      "generateMemberInvitationLink",
    );
  } catch (error) {
    console.error("Error in generateMemberInvitationLink:", error);
    return handleError(
      res,
      500,
      "Failed to generate invitation link",
      error,
      "generateMemberInvitationLink",
    );
  }
};

// Helper function to generate invitation token
const generateInvitationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const verifyMemberInvitationLink = async (req, res) => {
  const { token, orgId, email } = req.query;

  if (!token || !orgId || !email) {
    return handleError(
      res,
      400,
      "Missing required parameters: token, orgId, or email",
      null,
      "verifyMemberInvitationLink",
    );
  }

  try {
    // Check organization exists
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1`,
      [orgId],
    );

    if (orgCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Organization not found",
        null,
        "verifyMemberInvitationLink",
      );
    }

    // Check invitation
    const memberCheck = await pool.query(
      `SELECT * FROM organization_members 
       WHERE organization_id = $1
       AND email = $2
       AND invitation_token = $3
       AND invitation_status = 'pending'`,
      [orgId, email, token],
    );

    if (memberCheck.rows.length === 0) {
      return handleError(
        res,
        400,
        "Invalid or expired invitation link",
        null,
        "verifyMemberInvitationLink",
      );
    }

    const member = memberCheck.rows[0];

    // Check expiration
    if (
      member.invitation_expires_at &&
      new Date() > new Date(member.invitation_expires_at)
    ) {
      return handleError(
        res,
        400,
        "Invitation link has expired. Please request a new invitation.",
        null,
        "verifyMemberInvitationLink",
      );
    }

    // Check if user exists
    const userExists = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email],
    );

    if (userExists.rows.length === 0) {
      return handleError(
        res,
        404,
        "User account not found. Please register first.",
        null,
        "verifyMemberInvitationLink",
      );
    }

    const userId = userExists.rows[0].id;

    // Check if already active
    const activeMemberCheck = await pool.query(
      `SELECT * FROM organization_members
       WHERE organization_id = $1
       AND user_id = $2
       AND status = 'active'`,
      [orgId, userId],
    );

    if (activeMemberCheck.rows.length > 0) {
      return handleError(
        res,
        400,
        "User is already an active member of this organization",
        null,
        "verifyMemberInvitationLink",
      );
    }

    // Update member with correct values
    await pool.query(
      `UPDATE organization_members 
       SET status = 'active', 
           invitation_status = 'accepted',
           invitation_accepted_at = NOW(),
           updated_at = NOW(),
           user_id = $1
       WHERE id = $2`,
      [userId, member.id],
    );

    // Update user active status
    await pool.query(
      `UPDATE users 
       SET is_active = TRUE,
           updated_at = NOW()
       WHERE id = $1`,
      [userId],
    );

    // ✅ FIXED: Remove all // comments from SQL query
    const updatedMember = await pool.query(
      `SELECT 
        u.id AS user_id,
        u.name,
        u.email AS user_email,
        u.phone,
        u.profile_picture,
        u.is_active AS user_active,
        om.id AS member_id,
        om.email AS member_email,
        om.role,
        om.status AS member_status,
        om.department,
        om.created_at AS joined_at,
        om.updated_at AS member_updated_at
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.id = $1`,
      [member.id],
    );

    return handleSuccess(
      res,
      200,
      "Invitation verified and membership activated successfully",
      {
        member: updatedMember.rows[0],
        organizationId: orgId,
      },
      "verifyMemberInvitationLink",
    );
  } catch (error) {
    console.error("Error in verifyMemberInvitationLink:", error);
    return handleError(
      res,
      500,
      "Failed to verify invitation link",
      error,
      "verifyMemberInvitationLink",
    );
  }
};
export const changeStatusOfMember = async (req, res) => {
  const { orgId, userId, status } = req.body; // ✅ Changed from req.query to req.body

  // Validate required parameters
  if (!orgId || !userId || !status) {
    return handleError(
      res,
      400,
      "Missing required parameters: orgId, userId, or status",
      null,
      "changeStatusOfMember",
    );
  }

  // Validate status is one of allowed values
  const validStatuses = ["pending", "active", "inactive", "suspended"];
  if (!validStatuses.includes(status)) {
    return handleError(
      res,
      400,
      `Invalid status. Allowed values: ${validStatuses.join(", ")}`,
      null,
      "changeStatusOfMember",
    );
  }

  try {
    // Check organization exists
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1`,
      [orgId],
    );

    if (orgCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Organization not found",
        null,
        "changeStatusOfMember",
      );
    }

    // Check if member exists in this organization
    const memberCheck = await pool.query(
      `SELECT * FROM organization_members 
       WHERE organization_id = $1
       AND user_id = $2`,
      [orgId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Member not found in this organization",
        null,
        "changeStatusOfMember",
      );
    }

    const member = memberCheck.rows[0];

    // Check if user exists
    const userExists = await pool.query("SELECT id FROM users WHERE id = $1", [
      userId,
    ]);

    if (userExists.rows.length === 0) {
      return handleError(
        res,
        404,
        "User account not found",
        null,
        "changeStatusOfMember",
      );
    }

    // Check if member already has this status
    if (member.status === status) {
      return handleError(
        res,
        400,
        `Member is already ${status}`,
        null,
        "changeStatusOfMember",
      );
    }

    // ✅ Update member status
    await pool.query(
      `UPDATE organization_members 
       SET status = $1,
           updated_at = NOW()
       WHERE user_id = $2
       AND organization_id = $3`,
      [status, userId, orgId],
    );

    // Update user active status based on member status
    let userActive = false;
    if (status === "active") {
      userActive = true;
    } else if (status === "inactive" || status === "suspended") {
      userActive = false;
    }
    // For 'pending', keep user active status as is (or set to false)

    await pool.query(
      `UPDATE users 
       SET is_active = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [userActive, userId],
    );

    // Fetch updated member data
    const updatedMember = await pool.query(
      `SELECT 
        u.id AS user_id,
        u.name,
        u.email AS user_email,
        u.phone,
        u.profile_picture,
        u.is_active AS user_active,
        om.id AS member_id,
        om.email AS member_email,
        om.role,
        om.status AS member_status,
        om.department,
        om.created_at AS joined_at,
        om.updated_at AS member_updated_at
      FROM users u
      INNER JOIN organization_members om ON u.id = om.user_id
      WHERE om.id = $1`,
      [member.id],
    );

    return handleSuccess(
      res,
      200,
      `Member status changed to ${status} successfully`,
      {
        member: updatedMember.rows[0],
        organizationId: orgId,
        newStatus: status,
      },
      "changeStatusOfMember",
    );
  } catch (error) {
    console.error("Error in changeStatusOfMember:", error);
    return handleError(
      res,
      500,
      "Failed to change member status",
      error,
      "changeStatusOfMember",
    );
  }
};
export const deleteMember = async (req, res) => {
  const { userId, orgId } = req.query;

  // Validate required parameters
  if (!orgId || !userId) {
    return handleError(
      res,
      400,
      "Missing required parameters: orgId, userId",
      null,
      "deleteMember",
    );
  }

  try {
    // Check organization exists
    const orgCheck = await pool.query(
      `SELECT id FROM organizations WHERE id = $1`,
      [orgId],
    );

    if (orgCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Organization not found",
        null,
        "deleteMember",
      );
    }

    // Check if member exists in this organization
    const memberCheck = await pool.query(
      `SELECT * FROM organization_members 
       WHERE organization_id = $1
       AND user_id = $2`,
      [orgId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return handleError(
        res,
        404,
        "Member not found in this organization",
        null,
        "deleteMember",
      );
    }

    const member = memberCheck.rows[0];

    // Check if user exists
    const userExists = await pool.query(
      "SELECT id, role FROM users WHERE id = $1",
      [userId],
    );

    if (userExists.rows.length === 0) {
      return handleError(
        res,
        404,
        "User account not found",
        null,
        "deleteMember",
      );
    }

    // ✅ Prevent deleting the organization owner
    if (member.role === "owner") {
      return handleError(
        res,
        403,
        "Cannot delete the organization owner. Transfer ownership first.",
        null,
        "deleteMember",
      );
    }

    try {
      await pool.query("BEGIN");

      //  Delete from organization_members first (foreign key constraint)
      await pool.query(
        `DELETE FROM organization_members WHERE user_id = $1 AND organization_id = $2`,
        [userId, orgId],
      );

      //  Check if user is a member of any other organization
      const otherOrgsCheck = await pool.query(
        `SELECT COUNT(*) FROM organization_members WHERE user_id = $1`,
        [userId],
      );

      const isMemberOfOtherOrg = parseInt(otherOrgsCheck.rows[0].count) > 0;

      //  Only delete from users table if user is not a member of any other organization
      if (!isMemberOfOtherOrg) {
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      }

      await pool.query("COMMIT");

      return handleSuccess(
        res,
        200,
        isMemberOfOtherOrg
          ? "Member removed from organization successfully. User still exists in other organizations."
          : "Member and user account deleted successfully",
        {
          userId: userId,
          orgId: orgId,
          userDeleted: !isMemberOfOtherOrg,
          removedFromOrg: true,
        },
        "deleteMember",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in deleteMember:", error);
    return handleError(
      res,
      500,
      "Failed to delete member",
      error,
      "deleteMember",
    );
  }
};
export const updateMember = async (req, res) => {};
