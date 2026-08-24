const hook = process.env.RENDER_DEPLOY_HOOK_URL;

if (!hook) throw new Error('RENDER_DEPLOY_HOOK_URL is required.');

const response = await fetch(hook, { method: 'POST', redirect: 'error' });
if (!response.ok) throw new Error(`Render deploy hook returned HTTP ${response.status}.`);

console.log(`Render deployment accepted with HTTP ${response.status}.`);
