function CustomError(status, message) {
    this.status = status;
    this.name = "CustomError";
    this.message = message;
    this.stack = (new Error()).stack
}
CustomError.prototype = Object.create(Error.prototype);
CustomError.prototype.construstor = CustomError;

module.exports = CustomError;
