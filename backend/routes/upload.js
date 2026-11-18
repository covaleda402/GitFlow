const express = require('express');
const { uploadToCloudinary, getCloudinaryStatus } = require('../services/cloudinary');
const { optionalToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/upload/status
 * Returns Cloudinary connection status
 */
router.get('/status', (req, res) => {
  const status = getCloudinaryStatus();
  res.json({
    success: true,
    status
  });
});

/**
 * POST /api/upload
 * Uploads an image or document (Base64 data URI or image URL) to Cloudinary
 * Body: { file: string, folder?: string, tag?: string }
 */
router.post('/', optionalToken, async (req, res) => {
  try {
    const { file, folder = 'avatars', tag = 'avatar' } = req.body;

    if (!file) {
      return res.status(400).json({
        error: 'El campo "file" es requerido (debe ser una cadena base64 o URL).'
      });
    }

    // Basic payload size guard (max ~8MB in base64)
    if (typeof file === 'string' && file.length > 12 * 1024 * 1024) {
      return res.status(413).json({
        error: 'El archivo excede el tamaño máximo permitido (8MB).'
      });
    }

    const result = await uploadToCloudinary(file, {
      folder: `gitflow/${folder}`,
      tag,
      resource_type: 'auto'
    });

    res.json({
      success: true,
      message: 'Archivo subido exitosamente a Cloudinary.',
      url: result.url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      uploaded_by: req.user ? req.user.username : 'guest-developer'
    });
  } catch (error) {
    console.error('[Upload Endpoint Error]:', error.message);
    res.status(500).json({
      error: 'Error al procesar la subida a Cloudinary.',
      details: error.message
    });
  }
});

module.exports = router;
