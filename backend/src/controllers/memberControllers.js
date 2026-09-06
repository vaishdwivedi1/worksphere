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

  // Validate required fields
  if (!orgId || !memberEmail) {
    return handleError(
      res,
      400,
      "Invalid payload",
      null,
      "generateMemberInvitationLink",
    );
  }

  // Check if organization exists
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

  // Validate email and phone format
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
    // Check if user exists in users table (by email or phone)
    const userExists = await pool.query(
      `SELECT id FROM users WHERE email = $1 OR phone = $2`,
      [memberEmail, memberPhone],
    );

    // If user does NOT exist, return error
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

    // Check if user is already a member of this organization
    const userInOrg = await pool.query(
      `SELECT * FROM organization_members WHERE organization_id = $1 AND user_id = $2`,
      [orgId, userId],
    );

    if (userInOrg.rows.length == 0) {
      return handleError(
        res,
        400,
        "User does not exist with this email or phone. Please ask the user to register first.",
        null,
        "generateMemberInvitationLink",
      );
    }
    if (userInOrg.rows[0].status == "active") {
      return handleError(
        res,
        400,
        "User already registered.",
        null,
        "generateMemberInvitationLink",
      );
    }

    // Generate invitation link
    const invitationToken = generateInvitationToken();
    const link = `${process.env.FRONTENDURL}/accept-invitation?token=${invitationToken}&orgId=${orgId}&email=${memberEmail}`;

    // Send email invitation
    await sendEmailMessage(memberEmail, link);

    console.log({ link });

    // Return success response
    return handleSuccess(
      res,
      200,
      "Invitation link sent successfully",
      {
        email: memberEmail,
        orgId: orgId,
        link: link, // Be careful about exposing this in production
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

export const verifyMemberInvitationLink = async (req, res) => {};

export const updateMember = async (req, res) => {};
export const deleteMember = async (req, res) => {};
export const changeStatusOfMember = async (req, res) => {};
