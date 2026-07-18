const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

// Uploaded lift-request files never live inside the app source — they go to
// backend/uploads/<medical|documents>/, outside src/, so they aren't picked
// up by nodemon watchers or accidentally bundled.
const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const SUBDIRS = { MEDICAL: 'medical', SUPPORTING: 'documents' };

Object.values(SUBDIRS).forEach((dir) => {
  fs.mkdirSync(path.join(UPLOAD_ROOT, dir), { recursive: true });
});

const storage = multer.diskStorage({
  // NOTE: relies on the `documentType` text field being sent BEFORE the
  // `document` file field in the multipart form — multer/busboy parse
  // fields in stream order, so req.body.documentType is only populated by
  // the time this callback runs if the client puts it first in the
  // FormData. Defaults to "documents" if missing or sent out of order.
  destination: (req, file, cb) => {
    const type = SUBDIRS[req.body.documentType] ? req.body.documentType : 'SUPPORTING';
    cb(null, path.join(UPLOAD_ROOT, SUBDIRS[type]));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only PDF, JPEG, or PNG files are allowed'));
  }
  cb(null, true);
};

// Single optional file, field name "document". Used as middleware before
// the lift-request validation/controller so req.file / req.body are ready.
const uploadLiftDocument = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('document');

module.exports = { uploadLiftDocument, SUBDIRS, UPLOAD_ROOT };
