const cloudinary = require('cloudinary').v2;
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'akq70e4u',
  api_key: process.env.CLOUDINARY_API_KEY || '556236682817579',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'M__7-IYhnoDtc142wDpwGsIGUAs',
  secure: true
});

/**
 * Uploads a base64 encoded data URI or remote URL to Cloudinary
 * @param {string} fileContent - Base64 data URI (data:image/png;base64,...) or remote URL
 * @param {Object} options - Upload options (folder, tags, transformations)
 * @returns {Promise<Object>} Cloudinary upload result
 */
async function uploadToCloudinary(fileContent, options = {}) {
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('El archivo proporcionado para subir a Cloudinary es inválido.');
  }

  const defaultFolder = options.folder || 'gitflow/uploads';
  const uploadOptions = {
    folder: defaultFolder,
    resource_type: options.resource_type || 'auto',
    tags: ['gitflow', options.tag || 'general'],
    overwrite: true,
    invalidate: true,
    ...options
  };

  try {
    const result = await cloudinary.uploader.upload(fileContent, uploadOptions);
    return {
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at
    };
  } catch (error) {
    console.error('[Cloudinary Upload Error]:', error.message);
    throw new Error(`Fallo en la subida a Cloudinary: ${error.message}`);
  }
}

/**
 * Verifies Cloudinary connection and returns public config status
 */
function getCloudinaryStatus() {
  const isConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

  return {
    configured: isConfigured,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'akq70e4u',
    service: 'Cloudinary Media Asset Manager',
    environment: process.env.NODE_ENV || 'development'
  };
}

module.exports = {
  cloudinary,
  uploadToCloudinary,
  getCloudinaryStatus
};
