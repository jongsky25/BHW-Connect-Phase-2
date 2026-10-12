// Standalone local fixture: no Next app, environment files, database or authentication.
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';

export async function startStoryboard(port = 4176) {
  const server = await createServer({
    configFile: false, envFile: false,
    root: fileURLToPath(new URL('./tests/fixtures/assessor-simulation', import.meta.url)),
    esbuild: {jsx: 'automatic'},
    server: {host: '127.0.0.1', port, strictPort: true},
    logLevel: 'error',
  });
  await server.listen();
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = await startStoryboard();
  console.log(`Local fictional storyboard: ${server.resolvedUrls.local[0]}`);
  console.log('Nothing is saved. Reload resets review progress. Ctrl+C to stop.');
}
