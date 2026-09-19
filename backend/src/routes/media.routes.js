const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const cloudinaryService = require('../services/cloudinary.service');
const { uploadSingleImage } = require('../middleware/upload.middleware');
const { uploadImage } = require('../controllers/upload.controller');
const { catchAsync } = require('../utils/helpers');
const ApiError = require('../utils/ApiError');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
});

router.post('/sign', catchAsync(async (req, res) => {
  const { folder = 'listings/misc', resource_type = 'image' } = req.body || {};
  try {
    const result = cloudinaryService.signUpload(folder, resource_type);
    res.json(result);
  } catch (err) {
    throw ApiError.badRequest(err.message);
  }
}));

// Route for direct file upload - handles 'file', 'image', 'photo', 'media', etc.
router.post('/upload', uploadSingleImage('file'), uploadImage);

// Additional aliases for upload endpoint
router.post(['/image', '/file', '/document', '/media', '/'], uploadSingleImage('image'), uploadImage);

module.exports = router;
