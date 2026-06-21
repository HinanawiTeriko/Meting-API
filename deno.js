import config from './src/config.js'
import app from './app.js'
import { runHealthCheck } from './src/service/health-check.js'

Deno.cron('cookie-health-check', '0 1 * * *', async () => {
    console.log('[Cron] Running cookie health check...')
    const result = await runHealthCheck('netease')
    console.log(`[Cron] Cookie status: ${result.status}`)
})

Deno.serve(app.fetch)
