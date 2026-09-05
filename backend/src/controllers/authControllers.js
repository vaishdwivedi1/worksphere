// src/controllers/authControllers.js
import { handleError, handleSuccess } from "../commonFunctions/commonError.js";
import {
  generateEmailMobileOTP,
  validateEmailMobileOTP,
} from "../commonFunctions/otp.js";
import {
  isValidEmail,
  isValidMobile,
  isValidPlan,
  isValidPassword,
} from "../commonFunctions/regex.js";
import pool from "../config/postgres.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// ============================================
// CREATE ORGANIZATION - Step 1: Send OTP
// ============================================
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

    // Send OTPs
    await generateEmailMobileOTP(owner_email, "email");
    await generateEmailMobileOTP(company_email, "email");
    await generateEmailMobileOTP(owner_phone, "sms");

    // Return success response
    return handleSuccess(
      res,
      200,
      "OTP sent successfully",
      {
        owner_email,
        company_email,
        owner_phone,
        message: "Please verify email and mobile OTP",
      },
      "createOrganization",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal Server Error",
      error.message,
      "createOrganization",
    );
  }
};

// ============================================
// VERIFY AND CREATE ORGANIZATION - Step 2
// ============================================
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
    return handleError(
      res,
      400,
      "All fields including password and OTPs are required",
      null,
      "verifyAndCreateOrganization",
    );
  }

  // Validate password
  if (!isValidPassword(password)) {
    return handleError(
      res,
      400,
      "Password must be at least 8 characters long",
      null,
      "verifyAndCreateOrganization",
    );
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
      return handleError(
        res,
        400,
        "Invalid owner email OTP",
        null,
        "verifyAndCreateOrganization",
      );
    }

    if (!companyEmailVerified.success) {
      return handleError(
        res,
        400,
        "Invalid company email OTP",
        null,
        "verifyAndCreateOrganization",
      );
    }

    if (!phoneVerified.success) {
      return handleError(
        res,
        400,
        "Invalid phone OTP",
        null,
        "verifyAndCreateOrganization",
      );
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

    // Generate JWT Token
    const token = jwt.sign(
      {
        userId: userId,
        email: owner_email,
        role: "owner",
        organizationId: organizationId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    // Return success
    return handleSuccess(
      res,
      201,
      "Organization created successfully",
      {
        user: {
          id: userId,
          email: owner_email,
          name: owner_name,
          phone: owner_phone,
          role: "owner",
        },
        organization: {
          id: organizationId,
          company_name: company_name,
          plan: plan.toUpperCase(),
        },
        token,
      },
      "verifyAndCreateOrganization",
    );
  } catch (error) {
    await client.query("ROLLBACK");
    return handleError(
      res,
      500,
      "Failed to create organization",
      error.message,
      "verifyAndCreateOrganization",
    );
  } finally {
    client.release();
  }
};

// ============================================
// LOGIN USER
// ============================================
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // 1. Check required fields
  if (!email || !password) {
    return handleError(
      res,
      400,
      "Email and password are required",
      null,
      "loginUser",
    );
  }

  // 2. Validate email
  if (!isValidEmail(email)) {
    return handleError(res, 400, "Invalid email format", null, "loginUser");
  }

  try {
    // 3. Find user by email
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return handleError(res, 401, "Invalid credentials", null, "loginUser");
    }

    // 4. Compare password
    const isPassCorrect = await bcrypt.compare(password, user.password_hash);
    if (!isPassCorrect) {
      return handleError(res, 401, "Invalid credentials", null, "loginUser");
    }

    // 5. Get organization details
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

    const organization = orgResult.rows[0] || null;

    // 6. Generate JWT Token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: organization?.role || "member",
        organizationId: organization?.id || null,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
      },
    );

    // 7. Remove password from response
    delete user.password_hash;

    return handleSuccess(
      res,
      200,
      "Login successful",
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: organization?.role || "member",
        },
        organization: organization,
        token,
      },
      "loginUser",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "loginUser",
    );
  }
};

// ============================================
// FORGOT PASSWORD
// ============================================
export const forgotPassword = async (req, res) => {
  const { email, newpassword } = req.body;

  if (!email || !newpassword) {
    return handleError(
      res,
      400,
      "Email and new password are required",
      null,
      "forgotPassword",
    );
  }

  if (!isValidEmail(email)) {
    return handleError(
      res,
      400,
      "Invalid email format",
      null,
      "forgotPassword",
    );
  }

  if (newpassword.length < 6) {
    return handleError(
      res,
      400,
      "Password must be at least 6 characters",
      null,
      "forgotPassword",
    );
  }

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return handleError(res, 404, "User not found", null, "forgotPassword");
    }

    const hashPassword = await bcrypt.hash(newpassword, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2`,
      [hashPassword, email],
    );

    return handleSuccess(
      res,
      200,
      "Password reset successfully",
      { email: email },
      "forgotPassword",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "forgotPassword",
    );
  }
};

// ============================================
// CHANGE PASSWORD
// ============================================
export const changePassword = async (req, res) => {
  const { email, prevpassword, newpassword } = req.body;

  if (!email || !newpassword || !prevpassword) {
    return handleError(
      res,
      400,
      "All fields are required",
      null,
      "changePassword",
    );
  }

  if (!isValidEmail(email)) {
    return handleError(
      res,
      400,
      "Invalid email format",
      null,
      "changePassword",
    );
  }

  if (newpassword.length < 6) {
    return handleError(
      res,
      400,
      "Password must be at least 6 characters",
      null,
      "changePassword",
    );
  }

  try {
    const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
      email,
    ]);
    const user = result.rows[0];

    if (!user) {
      return handleError(res, 404, "User not found", null, "changePassword");
    }

    const isPassCorrect = await bcrypt.compare(
      prevpassword,
      user.password_hash,
    );
    if (!isPassCorrect) {
      return handleError(
        res,
        401,
        "Current password is incorrect",
        null,
        "changePassword",
      );
    }

    const hashPassword = await bcrypt.hash(newpassword, 10);

    const userResult = await pool.query(
      `UPDATE users
       SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
       WHERE email = $2
       RETURNING id, email, name`,
      [hashPassword, email],
    );

    return handleSuccess(
      res,
      200,
      "Password changed successfully",
      { user: userResult.rows[0] },
      "changePassword",
    );
  } catch (error) {
    return handleError(
      res,
      500,
      "Internal server error",
      error.message,
      "changePassword",
    );
  }
};

// ============================================
// LOGOUT
// ============================================
export const logout = async (req, res) => {};

// ============================================
// REFRESH TOKEN
// ============================================
export const refreshToken = async (req, res) => {};
