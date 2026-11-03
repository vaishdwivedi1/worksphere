import jwt from "jsonwebtoken";
import { handleError } from "../commonFunctions/commonError.js";

export const verifyToken = (req, res, next) => {
  const fn = "verifyToken";
  try {
    const authHeader =
      req.headers.authorization || req.headers.Authorization || "";

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return handleError(res, 401, "Authorization token missing", null, fn);
    }

    const token = authHeader.slice(7).trim(); // strip "Bearer "
    if (!token) {
      return handleError(res, 401, "Authorization token missing", null, fn);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return handleError(res, 401, "Token expired", null, fn);
      }
      return handleError(res, 401, "Invalid token", null, fn);
    }

    if (!decoded?.userId) {
      return handleError(res, 401, "Invalid token payload", null, fn);
    }

    // Expose the payload in multiple convenient shapes so downstream
    // controllers (including `me`) can read it whichever way they do.
    req.user = {
      id: decoded.userId,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      organizationId: decoded.organizationId || null,
      memberId: decoded.memberId || null,
    };
    req.userId = decoded.userId;
    req.memberId = decoded.memberId || null;
    req.organizationId = decoded.organizationId || null;

    return next();
  } catch (error) {
    return handleError(res, 500, "Auth middleware failed", error, fn);
  }
};

export default verifyToken;
