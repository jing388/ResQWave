const AppError = require('../exceptions/AppError');

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // In production, we can have more specific handling logic here
    // For example, handling Mongoose/TypeORM specific errors and converting them to AppError
    
    let error = { ...err };
    error.message = err.message;
    
    sendErrorProd(error, res);
  }
};

const sendErrorDev = (err, res) => {
  console.error('ERROR ', err);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak details
    console.error('ERROR', err); // Log to console or external logging service

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

module.exports = errorHandler;
