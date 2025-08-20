const pool = require('./db');
const AWS = require('aws-sdk');
const B2 = require('backblaze-b2');
const path = require('path');
require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});
const b2 = new B2({
  applicationKeyId: process.env.B2_KEY_ID,
  applicationKey: process.env.B2_APPLICATION_KEY,
});

async function migrateFoldersToCold() {
  await b2.authorize();
  const now = new Date();
  // Find folders older than 48 hours and still in hot tier
  const { rows } = await pool.query("SELECT * FROM folders WHERE status = 'hot' AND created_at < NOW() - INTERVAL '48 hours'");
  for (const folder of rows) {
    // Download from S3
    const s3Key = folder.s3_key;
    const s3Obj = await s3.getObject({ Bucket: process.env.AWS_S3_BUCKET, Key: s3Key }).promise();
    // Upload to B2
    const bucketId = process.env.B2_BUCKET_ID;
    const uploadUrlResponse = await b2.getUploadUrl({ bucketId });
    await b2.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      filename: path.basename(s3Key),
      data: s3Obj.Body,
      contentType: s3Obj.ContentType,
    });
    // Update folder status and b2_key
    await pool.query("UPDATE folders SET status = 'cold', b2_key = $1 WHERE id = $2", [path.basename(s3Key), folder.id]);
    console.log(`Migrated folder ${folder.id} to cold storage.`);
  }
  pool.end();
}

migrateFoldersToCold();
