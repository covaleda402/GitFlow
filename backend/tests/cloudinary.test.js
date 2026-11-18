const test = require('node:test');
const assert = require('node:assert');
const { getCloudinaryStatus, uploadToCloudinary } = require('../services/cloudinary');

test('Cloudinary: Validates environment configuration status', () => {
  const status = getCloudinaryStatus();
  assert.strictEqual(status.configured, true, 'Cloudinary must be configured');
  assert.strictEqual(status.cloud_name, 'akq70e4u');
  assert.strictEqual(status.service, 'Cloudinary Media Asset Manager');
});

test('Cloudinary: Rejects empty or invalid file upload payload', async () => {
  await assert.rejects(
    async () => {
      await uploadToCloudinary(null);
    },
    /archivo proporcionado para subir a Cloudinary es inválido/i
  );

  await assert.rejects(
    async () => {
      await uploadToCloudinary(12345);
    },
    /archivo proporcionado para subir a Cloudinary es inválido/i
  );
});
