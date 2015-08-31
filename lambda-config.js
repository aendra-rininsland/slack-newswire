module.exports = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY_ID,
  region: process.env.AWS_REGION,
  handler: 'index.handler',
  role: process.env.ROLE_ARN,
  functionName: process.env.FUNCTION_NAME,
  description: process.env.FUNCTION_DESCRIPTION,
  timeout: 10,
  memorySize: 128
}
