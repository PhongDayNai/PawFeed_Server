const port = process.env.PORT || 3000;
const url = `http://127.0.0.1:${port}/api/health`;

try {
  const response = await fetch(url);
  const body = await response.json();

  if (!response.ok || body.ok !== true) {
    console.error('Health check failed:', response.status, body);
    process.exit(1);
  }

  console.log('Health check OK:', body);
} catch (error) {
  console.error(`Cannot reach ${url}`);
  console.error(error.message);
  process.exit(1);
}
