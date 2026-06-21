import store from '../admin/store.js'
import { getEnv } from '../util.js'

export async function runHealthCheck(server = 'netease') {
    let cookie = ''
    const storedCookie = store.getActiveCookie(server)
    if (storedCookie) {
        cookie = storedCookie.cookie
    }
    if (!cookie && getEnv('NETEASE_COOKIE') && server === 'netease') {
        cookie = getEnv('NETEASE_COOKIE')
    }
    if (!cookie && getEnv('TENCENT_COOKIE') && server === 'tencent') {
        cookie = getEnv('TENCENT_COOKIE')
    }
    if (!cookie) {
        return { status: 'no_cookie', message: '未配置 Cookie' }
    }

    const Providers = (await import('../providers/index.js')).default
    const p = new Providers()
    const url = await p.get(server).handle('url', '22704470', cookie)
    const isFull = url && !url.includes('try') && !url.includes('trial')

    if (!isFull) {
        const resendKey = getEnv('RESEND_API_KEY')
        const notifyEmail = getEnv('NOTIFY_EMAIL')
        if (resendKey && notifyEmail) {
            try {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${resendKey}`,
                    },
                    body: JSON.stringify({
                        from: 'Meting-API <onboarding@resend.dev>',
                        to: [notifyEmail],
                        subject: 'Meting-API Cookie 已过期',
                        html: `<p>平台: ${server}</p><p>时间: ${new Date().toLocaleString('zh-CN')}</p><p>请登录网易云音乐，复制新 Cookie 后更新 Deno Deploy 环境变量 <code>NETEASE_COOKIE</code>，然后重新部署。</p>`,
                    }),
                })
            } catch (e) { /* ignore */ }
        }
        const webhookUrl = getEnv('WEBHOOK_URL')
        if (webhookUrl) {
            try {
                await fetch(webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: 'Meting-API Cookie 已过期',
                        message: `平台: ${server}\n时间: ${new Date().toLocaleString('zh-CN')}\n请更新环境变量后重新部署。`,
                    }),
                })
            } catch (e) { /* ignore */ }
        }
        return { status: 'expired', cookie_valid: false, checked_at: new Date().toISOString() }
    }
    return { status: 'ok', cookie_valid: true, checked_at: new Date().toISOString() }
}
