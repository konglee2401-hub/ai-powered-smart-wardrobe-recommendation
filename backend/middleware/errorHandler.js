/**
 * Validate that required fields exist in request (body or query)
 */
export const validateRequest = (req, fields = []) => {
  const missing = [];
  for (const field of fields) {
    if (!req.body?.[field] && !req.query?.[field] && field !== 'userId') {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Handle errors in controllers
 */
export const handleError = (res, error) => {
  console.error('Controller error:', error.message, error.stack);
  const statusCode = error.statusCode || 500; // Changed from 400 to 500 for unhandled errors
  const message = error.message || 'An error occurred';
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
  });
};
