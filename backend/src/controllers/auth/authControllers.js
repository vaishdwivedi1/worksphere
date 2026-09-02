import {
  handleError,
  handleSuccess,
} from "../../commonFunctions/commonError.js";
import {
  generateEmailMobileOTP,
  validateEmailMobileOTP,
} from "../../commonFunctions/otp.js";
import {
  isValidEmail,
  isValidMobile,
  isValidPlan,
  isValidPassword,
} from "../../commonFunctions/regex.js";
import pool from "../../config/postgres.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

export const createOrganization = async (req, res) => {
  const {
    company_name,
    owner_name,
    owner_email,
    company_email,
    company_logo,
    plan,
    owner_phone,
    password,
  } = req.body;

  try {
    // Check required fields
    if (
      !company_name ||
      !owner_name ||
      !owner_email ||
      !owner_phone ||
      !company_email ||
      !company_logo ||
      !plan ||
      !password
    ) {
      return handleError(
        res,
        400,
        "All fields including password are required",
        null,
        "createOrganization",
      );
    }

    // Validate email
    if (!isValidEmail(company_email)) {
      return handleError(
        res,
        400,
        "Invalid company email format",
        null,
        "createOrganization",
      );
    }
    if (!isValidEmail(owner_email)) {
      return handleError(
        res,
        400,
        "Invalid owner email format",
        null,
        "createOrganization",
      );
    }

    // Validate phone
    if (!isValidMobile(owner_phone)) {
      return handleError(
        res,
        400,
        "Invalid owner phone format. Use: +91XXXXXXXXXX or XXXXXXXXXX",
        null,
        "createOrganization",
      );
    }

    // Validate plan
    if (!isValidPlan(plan)) {
      return handleError(
        res,
        400,
        "Invalid plan selected. Must be FREE, PRO, or PREMIUM",
        null,
        "createOrganization",
      );
    }

    // Validate password
    if (!isValidPassword(password)) {
      return handleError(
        res,
        400,
        "Password must be at least 8 characters long",
        null,
        "createOrganization",
      );
    }

    // Check if email/phone already exists
    const existingCheck = await pool.query(
      `SELECT owner_email, owner_phone, company_email FROM organizations 
       WHERE owner_email = $1 OR owner_phone = $2 OR company_email = $3`,
      [owner_email, owner_phone, company_email],
    );

    if (existingCheck.rows.length > 0) {
      const existing = existingCheck.rows[0];
      if (existing.owner_email === owner_email) {
        return handleError(
          res,
          400,
          "Owner email already registered",
          null,
          "createOrganization",
        );
      }
      if (existing.owner_phone === owner_phone) {
        return handleError(
          res,
          400,
          "Owner phone already registered",
          null,
          "createOrganization",
        );
      }
      if (existing.company_email === company_email) {
        return handleError(
          res,
          400,
          "Company email already registered",
          null,
          "createOrganization",
        );
      }
    }

    // Check if user exists
    const userCheck = await pool.query(
      `SELECT email FROM users WHERE email = $1`,
      [owner_email],
    );

    if (userCheck.rows.length > 0) {
      return handleError(
        res,
        400,
        "User with this email already exists",
        null,
        "createOrganization",
      );
    }

    await generateEmailMobileOTP(owner_email, "email");
    await generateEmailMobileOTP(company_email, "email");
    await generateEmailMobileOTP(owner_phone, "sms");

    // Return success response
    return res.status(200).json({
      success: true,
      statusCode: 200,
      message: "OTP sent successfully",
      data: {
        owner_email,
        company_email,
        owner_phone,
        message: "Please verify email and mobile OTP",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Internal Server Error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

// authControllers.js - Fixed
export const verifyAndCreateOrganization = async (req, res) => {
  const {
    company_name,
    owner_name,
    owner_email,
    company_email,
    company_logo,
    plan,
    owner_phone,
    password,
    owner_otp,
    company_otp,
    phone_otp,
  } = req.body;

  // Validate required fields
  if (
    !owner_email ||
    !company_email ||
    !owner_phone ||
    !owner_otp ||
    !company_otp ||
    !phone_otp ||
    !company_name ||
    !owner_name ||
    !company_logo ||
    !plan ||
    !password
  ) {
    return res.status(400).json({
      success: false,
      message: "All fields including password and OTPs are required",
      timestamp: new Date().toISOString(),
    });
  }

  // Validate password
  if (!isValidPassword(password)) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters long",
      timestamp: new Date().toISOString(),
    });
  }

  const client = await pool.connect();

  try {
    // Verify OTPs
    const ownerEmailVerified = await validateEmailMobileOTP(
      owner_email,
      owner_otp,
    );

    const companyEmailVerified = await validateEmailMobileOTP(
      company_email,
      company_otp,
    );

    const phoneVerified = await validateEmailMobileOTP(owner_phone, phone_otp);

    if (!ownerEmailVerified.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid owner email OTP",
        timestamp: new Date().toISOString(),
      });
    }

    if (!companyEmailVerified.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid company email OTP",
        timestamp: new Date().toISOString(),
      });
    }

    if (!phoneVerified.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone OTP",
        timestamp: new Date().toISOString(),
      });
    }

    await client.query("BEGIN");

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, phone, name, password_hash, is_active, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
       RETURNING id, email, name, phone`,
      [owner_email, owner_phone, owner_name, hashedPassword, true],
    );

    const userId = userResult.rows[0].id;

    // Create organization
    const orgResult = await client.query(
      `INSERT INTO organizations (
        company_name,
        owner_name,
        owner_email,
        company_email,
        company_logo,
        plan,
        owner_phone,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) 
      RETURNING id, company_name, owner_email, plan`,
      [
        company_name,
        owner_name,
        owner_email,
        company_email,
        company_logo,
        plan.toUpperCase(),
        owner_phone,
      ],
    );

    const organizationId = orgResult.rows[0].id;

    // Create organization_members record
    await client.query(
      `INSERT INTO organization_members (
        organization_id,
        user_id,
        email,
        role,
        status,
        invited_by,
        joined_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())`,
      [organizationId, userId, owner_email, "owner", "active", userId],
    );

    await client.query("COMMIT");

    // Return success
    return res.status(201).json({
      success: true,
      statusCode: 201,
      message: "Organization created successfully",
      data: {
        user: {
          id: userId,
          email: owner_email,
          name: owner_name,
          phone: owner_phone,
        },
        organization: {
          id: organizationId,
          company_name: company_name,
          plan: plan.toUpperCase(),
        },
        // token,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to create organization",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  } finally {
    client.release();
  }
};

// POST /auth/login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Check required fields
  if (!email || !password) {
    return handleError(res, 400, "Invalid data", null, "loginUser");
  }

  // 2. Validate email
  if (!isValidEmail(email)) {
    return handleError(res, 400, "Invalid email format", null, "loginUser");
  }

  // 3. Find user by email
  const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
    email,
  ]);

  // 4. Check user exists
  const user = result.rows[0];

  if (!user) {
    return handleError(res, 400, "User not found", null, "loginUser");
  }

  // 5. Compare entered password with hashed password
  const isPassCorrect = await bcrypt.compare(password, user.password_hash);

  // 6. Check password
  if (!isPassCorrect) {
    return handleError(res, 400, "Invalid credentials", null, "loginUser");
  }

  const orgResult = await pool.query(
    `SELECT 
      o.id,
      o.company_name,
      o.plan,
      om.role
   FROM organizations o
   INNER JOIN organization_members om 
      ON o.id = om.organization_id
   WHERE om.user_id = $1 
      AND om.status = 'active'`,
    [user.id],
  );

  const organization = orgResult.rows[0];

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );

  // 9. Don't send password hash to frontend
  delete user.password_hash;

  return res.status(200).json({
    success: true,
    statusCode: 200,
    message: "User logged in successfully",
    data: {
      user,
      organization: organization || null,
      token,
    },
    timestamp: new Date().toISOString(),
  });
};

// Other functions (keep as is)
export const addMember = async (req, res) => {};
export const generateMemberInvitationLink = async (req, res) => {};
export const forgotPassword = async (req, res) => {};
export const changePassword = async (req, res) => {};
export const logout = async (req, res) => {};
export const refreshToken = async (req, res) => {};
export const profile = async (req, res) => {};
