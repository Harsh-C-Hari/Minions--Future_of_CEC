// Standard success response shape, mirrors ApiError so every response
// (success or failure) has the same { success, statusCode, message, ... } shell.
class ApiResponse {
  constructor(statusCode, data = null, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

module.exports = ApiResponse;
