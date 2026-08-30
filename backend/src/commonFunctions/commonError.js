// commonFunctions/commonError.js
export const handleSuccess = (res, statusCode, message, data, functionName) => {
  console.log(` Success in ${functionName}:`, message);

  // Make sure this returns properly
  return res.status(statusCode).json({
    success: true,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
};

export const handleError = (res, statusCode, message, error, functionName) => {
  console.error(` Error in ${functionName}:`, message, error);

  return res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    error: error ? error.toString() : null,
    timestamp: new Date().toISOString(),
  });
};
