import { S3Client } from '@aws-sdk/client-s3';

// Configure DigitalOcean Spaces S3 Client
const spacesClient = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT || '',
  region: process.env.DO_SPACES_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET || '',
  },
});

export default spacesClient;
