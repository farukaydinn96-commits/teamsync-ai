export const logEvent = (level, msg, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...meta
  };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  logEvent('error', err.message || 'Unhandled server error', {
    path: req.originalUrl,
    method: req.method,
    statusCode
  });
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error'
  });
};
