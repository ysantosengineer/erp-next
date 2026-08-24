const apiUrl = process.env.SMOKE_API_URL?.replace(/\/$/, '');
const webUrl = process.env.SMOKE_WEB_URL?.replace(/\/$/, '');
const expectedVersion = process.env.EXPECTED_VERSION?.slice(0, 12);
const attempts = 30;

if (!apiUrl || !webUrl) throw new Error('SMOKE_API_URL and SMOKE_WEB_URL are required.');

async function waitFor(name, check) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await check();
      console.log(`${name} is healthy (attempt ${attempt}/${attempts}).`);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw lastError;
}

await waitFor('API', async () => {
  const response = await fetch(`${apiUrl}/ready`, { redirect: 'error' });
  if (!response.ok) throw new Error(`API readiness returned HTTP ${response.status}.`);
  const body = await response.json();
  if (body.status !== 'ok' || body.database !== 'ok')
    throw new Error('API readiness payload is invalid.');
  if (expectedVersion && body.version !== expectedVersion)
    throw new Error(`API is running version ${body.version}, expected ${expectedVersion}.`);
});

await waitFor('Web', async () => {
  const response = await fetch(webUrl, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Web returned HTTP ${response.status}.`);
});
