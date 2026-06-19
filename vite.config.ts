import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * WHO ICD-API token broker (DEV server only).
 *
 * The WHO OAuth token endpoint requires the client_secret and does NOT send
 * CORS headers, so the secret can never live in the browser. This middleware
 * holds the credentials server-side, exchanges them for a token (cached until
 * expiry) and proxies same-origin `/who-icd/search?q=…&release=…` to the WHO
 * ICD-11 MMS search — the browser never sees the secret.
 *
 * Creds come from NON-VITE env (so they're never bundled): WHO_ICD_CLIENT_ID,
 * WHO_ICD_CLIENT_SECRET. For PRODUCTION (static deploy, no server) replicate
 * this exact logic as a serverless function at the same path.
 */
function whoIcdProxy(env: Record<string, string>): Plugin {
  const clientId = env.WHO_ICD_CLIENT_ID
  const clientSecret = env.WHO_ICD_CLIENT_SECRET
  const TOKEN_URL = 'https://icdaccessmanagement.who.int/connect/token'
  let token = ''
  let tokenExp = 0 // epoch ms

  async function getToken(): Promise<string> {
    if (token && Date.now() < tokenExp - 60_000) return token
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'icdapi_access',
      grant_type: 'client_credentials',
    })
    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!r.ok) throw new Error(`token ${r.status}`)
    const j = (await r.json()) as { access_token: string; expires_in: number }
    token = j.access_token
    tokenExp = Date.now() + (j.expires_in ?? 3600) * 1000
    return token
  }

  return {
    name: 'who-icd-proxy',
    apply: 'serve',
    configureServer(server) {
      if (!clientId || !clientSecret) {
        server.config.logger.warn('[who-icd-proxy] WHO_ICD_CLIENT_ID/SECRET not set — /who-icd disabled')
        return
      }
      server.middlewares.use('/who-icd/search', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const q = url.searchParams.get('q')?.trim() ?? ''
          const release = url.searchParams.get('release') ?? '2024-01'
          const lang = url.searchParams.get('lang') ?? 'en'
          if (!q) {
            res.setHeader('Content-Type', 'application/json')
            res.end('{"destinationEntities":[]}')
            return
          }
          const at = await getToken()
          const api = `https://id.who.int/icd/release/11/${release}/mms/search?q=${encodeURIComponent(q)}&flatResults=true`
          const r = await fetch(api, {
            headers: {
              Authorization: `Bearer ${at}`,
              Accept: 'application/json',
              'Accept-Language': lang,
              'API-Version': 'v2',
            },
          })
          const text = await r.text()
          res.statusCode = r.status
          res.setHeader('Content-Type', 'application/json')
          res.end(text)
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e) }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // load ALL vars (incl. non-VITE)
  return {
    base: '/cis-redesign-2026/',
    plugins: [react(), tailwindcss(), whoIcdProxy(env)],
    resolve: {
      alias: {
        '@': '/src',
      },
      // MUI X Scheduler + Base UI must share the app's single React instance,
      // otherwise hooks resolve against a null dispatcher ("Invalid hook call").
      dedupe: ['react', 'react-dom', '@base-ui/react'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        '@mui/x-scheduler/event-calendar',
        '@mui/x-scheduler/models',
      ],
    },
    server: {
      port: 5167,
    },
  }
})
