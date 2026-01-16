const AppError = require('./AppError');

class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error') {
    super(message, 500);
  }
}

module.exports = InternalServerError;
