const path = require('path');
const fs = require('fs').promises;
const uuid = require('uuid');
const config = require('../config');
const imageProcessingService = require('../services/image-processing.service');
const { processedDir } = require('../services/image-processing.service');
const storageService = require('../services/storage.service');
const ApiError = require('../utils/ApiError');
const { catchAsync } = require('../utils/helpers');

/**
 * Controller to handle file/image uploading, WebP conversion/document handling, compression and storage.
 * Ensures temporary files are deleted after execution regardless of success or failure.
 * Supports both diskStorage (path) and memoryStorage (buffer).
 */
const uploadImage = catchAsync(async (req, res, next) => {
  const targetFile = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

  if (!targetFile) {
    return next(ApiError.badRequest('No file provided for upload.'));
  }

  let rawFilePath = targetFile.path;
  let createdTempFile = false;

  const originalName = targetFile.originalname || 'upload.jpg';
  const originalExt = path.extname(originalName).toLowerCase() || '.jpg';
  const mimeType = (targetFile.mimetype || '').toLowerCase();
  const isDocument = originalExt === '.pdf' || originalExt === '.doc' || originalExt === '.docx' || mimeType.includes('pdf');
  
  // If memoryStorage was used and file path is undefined, write buffer to a temp file
  if (!rawFilePath && targetFile.buffer) {
    const { tempDir } = require('../middleware/upload.middleware');
    const tempFileName = `temp-${Date.now()}-${uuid.v4()}${originalExt}`;
    rawFilePath = path.join(tempDir, tempFileName);
    await fs.writeFile(rawFilePath, targetFile.buffer);
    createdTempFile = true;
  }

  if (!rawFilePath) {
    return next(ApiError.badRequest('Unable to access uploaded file buffer or path.'));
  }

  const uniqueName = isDocument ? `${uuid.v4()}${originalExt}` : `${uuid.v4()}.webp`;
  const processedFilePath = path.join(processedDir, uniqueName);

  let isProcessedFileCreated = false;
  let uploadResult = null;
  let processResult = { width: null, height: null, size: targetFile.size || 0, format: originalExt.replace('.', '') };

  try {
    if (isDocument) {
      // 1a. For documents (PDF, DOC), copy raw file directly to processed directory
      await fs.copyFile(rawFilePath, processedFilePath);
      isProcessedFileCreated = true;
    } else {
      // 1b. For images, process using Sharp (auto-rotate, smart resize, convert to WebP, remove EXIF)
      try {
        processResult = await imageProcessingService.processImage(rawFilePath, processedFilePath);
        isProcessedFileCreated = true;
      } catch (sharpErr) {
        // Fallback: If Sharp fails (e.g. unprocessable format like HEIC/raw), copy raw file directly
        const rawUniqueName = `${uuid.v4()}${originalExt}`;
        const fallbackPath = path.join(processedDir, rawUniqueName);
        await fs.copyFile(rawFilePath, fallbackPath);
        isProcessedFileCreated = true;
        uploadResult = await storageService.upload(fallbackPath, rawUniqueName);
        
        return res.status(201).json({
          success: true,
          message: 'File uploaded successfully',
          filename: rawUniqueName,
          url: uploadResult.url,
          secure_url: uploadResult.url,
          size: targetFile.size || 0,
          format: originalExt.replace('.', ''),
          data: {
            url: uploadResult.url,
            filename: rawUniqueName
          }
        });
      }
    }

    // 2. Upload to storage provider (LocalStorage or CloudinaryStorage)
    uploadResult = await storageService.upload(processedFilePath, uniqueName);

    // 3. Return response with both top-level 'url' and nested 'data.url' for client compatibility
    return res.status(201).json({
      success: true,
      message: 'File uploaded successfully',
      filename: uniqueName,
      url: uploadResult.url,
      secure_url: uploadResult.url,
      size: processResult.size,
      format: processResult.format,
      dimensions: {
        width: processResult.width,
        height: processResult.height
      },
      data: {
        url: uploadResult.url,
        filename: uniqueName
      }
    });

  } catch (err) {
    if (isProcessedFileCreated) {
      try {
        await fs.unlink(processedFilePath);
      } catch {
        // Silent catch
      }
    }
    throw err;
  } finally {
    // Clean up temporary file
    if (rawFilePath) {
      try {
        await fs.unlink(rawFilePath);
      } catch {
        // Silent catch
      }
    }
  }
});

module.exports = {
  uploadImage
};
