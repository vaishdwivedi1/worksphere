// otp.js
import twilio from "twilio";
import nodemailer from "nodemailer";
import { emailRegex, phoneRegex } from "./regex.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

// Email transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

// In-memory OTP store
const otpStore = new Map();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send email OTP
const sendEmailOTP = async (email, otp) => {
  console.log({ email, otp });
  const mailOptions = {
    from: process.env.NODEMAILER_EMAIL,
    to: email,
    subject: "Your OTP for Organization Registration",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #333;">OTP Verification</h2>
        <p style="color: #555;">Your OTP for organization registration is:</p>
        <h1 style="color: #4CAF50; font-size: 40px; letter-spacing: 8px; text-align: center; padding: 20px; background: #f5f5f5; border-radius: 5px;">${otp}</h1>
        <p style="color: #555;">This OTP is valid for <strong>5 minutes</strong>.</p>
        <p style="color: #888; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        <hr style="border: 1px solid #e0e0e0;">
        <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const generateEmailMobileOTP = async (to, channel) => {
  try {
    if (!to || !channel) {
      throw new Error("Recipient and channel are required");
    }

    const validChannels = ["email", "sms"];
    if (!validChannels.includes(channel)) {
      throw new Error(
        `Invalid OTP channel. Must be one of: ${validChannels.join(", ")}`,
      );
    }

    // Generate OTP
    const otp = generateOTP();

    if (channel === "email") {
      // Validate email
      if (!emailRegex.test(to)) {
        throw new Error("Invalid email format");
      }
      to = to.trim().toLowerCase();

      // Store OTP
      otpStore.set(to, {
        otp,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      // Send email
      await sendEmailOTP(to, otp);

      return {
        success: true,
        status: "pending",
        to,
        channel,
        message: "OTP sent to email",
      };
    }

    if (channel === "sms") {
      // Validate phone
      if (!phoneRegex.test(to)) {
        throw new Error("Invalid phone number format");
      }
      to = to.replace(/[\s\-\(\)]/g, "");

      // Send SMS via Twilio
      const verification = await client.verify.v2
        .services(serviceSid)
        .verifications.create({
          to,
          channel: "sms",
        });

      return {
        success: true,
        status: verification.status,
        sid: verification.sid,
        to,
        channel,
      };
    }
  } catch (error) {
    console.error(`OTP generation error for ${to}:`, error.message);
    throw new Error(`Failed to send OTP: ${error.message}`);
  }
};

export const validateEmailMobileOTP = async (to, code) => {
  try {
    if (!to || !code) {
      throw new Error("Recipient and OTP code are required");
    }

    if (code.length !== 6) {
      throw new Error("OTP must be 6 digits");
    }

    to = to.trim().toLowerCase();

    // Check email OTP from store
    if (otpStore.has(to)) {
      const storedData = otpStore.get(to);

      // Check if expired
      if (Date.now() > storedData.expiresAt) {
        otpStore.delete(to);
        return {
          success: false,
          status: "expired",
          to,
          message: "OTP has expired. Please request a new one.",
        };
      }

      // Verify OTP
      if (storedData.otp === code) {
        otpStore.delete(to);
        return {
          success: true,
          status: "approved",
          to,
          message: "OTP verified successfully",
        };
      } else {
        return {
          success: false,
          status: "pending",
          to,
          message: "Invalid OTP. Please try again.",
        };
      }
    }

    // If not email OTP, check Twilio (for SMS)
    try {
      const verificationCheck = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({
          to,
          code: code.toString(),
        });

      return {
        success: verificationCheck.status === "approved",
        status: verificationCheck.status,
        to,
        message:
          verificationCheck.status === "approved"
            ? "OTP verified successfully"
            : "Invalid OTP. Please try again.",
      };
    } catch (twilioError) {
      return {
        success: false,
        status: "error",
        to,
        message: "OTP verification failed",
      };
    }
  } catch (error) {
    console.error(`OTP validation error for ${to}:`, error.message);
    throw new Error(`Failed to verify OTP: ${error.message}`);
  }
};

// Cleanup expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expiresAt) {
      otpStore.delete(key);
    }
  }
}, 60000);
