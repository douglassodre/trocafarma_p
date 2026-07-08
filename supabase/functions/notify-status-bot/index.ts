// Edge Function server-side que substitui a chamada direta do navegador
// para o bot de Status no Railway. O token do Railway fica em secret aqui
// e nunca chega ao bundle do usuario.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STATUS_BOT_URL = Deno.env.get('STATUS_BOT_URL')!
const STATUS_BOT_TOKEN = Deno.env.get('STATUS_BOT_TOKEN')!
const WEBHOOK_TOKEN_HEADER = 'x-status-webhook-token'
const STORAGE_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/anuncios-fotos/`

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': `authorization, x-client-info, apikey, content-type, ${WEBHOOK_TOKEN_HEADER}`,
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function buildStatusBotRequest(imageBase64: string | null, caption: string) {
  if (imageBase64) {
    return {
      url: STATUS_BOT_URL,
      body: { imageBase64, caption },
    }
  }

  const textStatusUrl = STATUS_BOT_URL.replace(/\/post-status\/?$/, '/post-status-text')
  return {
    url: textStatusUrl,
    body: textStatusUrl === STATUS_BOT_URL ? { caption } : { text: caption },
  }
}

async function postStatusWithRetry(imageBase64: string | null, caption: string) {
  const attempt = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)
    const statusBotRequest = buildStatusBotRequest(imageBase64, caption)

    try {
      const response = await fetch(statusBotRequest.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': STATUS_BOT_TOKEN,
        },
        body: JSON.stringify(statusBotRequest.body),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      return response
    } catch (err) {
      clearTimeout(timeout)
      throw err
    }
  }

  try {
    const response = await attempt()
    if (response.ok) return { ok: true }

    if (response.status >= 500) {
      throw new Error(`status bot respondeu ${response.status}`)
    }

    const text = await response.text()
    return { ok: false, error: `status bot ${response.status}: ${text}` }
  } catch (_firstErr) {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    try {
      const response = await attempt()
      if (response.ok) return { ok: true }

      const text = await response.text()
      return { ok: false, error: `status bot ${response.status} (retry): ${text}` }
    } catch (secondErr) {
      return { ok: false, error: `falha apos retry: ${String(secondErr)}` }
    }
  }
}

function getFilePathFromUrl(photoUrl?: string): string | null {
  if (!photoUrl?.startsWith(STORAGE_PUBLIC_PREFIX)) return null
  return decodeURIComponent(photoUrl.slice(STORAGE_PUBLIC_PREFIX.length))
}

function resolvePayload(payload: Record<string, unknown>) {
  const record = payload.record as Record<string, unknown> | undefined
  const filePath = typeof payload.filePath === 'string'
    ? payload.filePath
    : getFilePathFromUrl(record?.foto_url as string | undefined)

  const caption = typeof payload.caption === 'string'
    ? payload.caption
    : record?.descricao_customizada as string | undefined

  const ownerId = typeof record?.usuario_id === 'string'
    ? record.usuario_id
    : filePath?.split('/')[0]

  return {
    filePath,
    caption: caption?.trim() || 'Novo anuncio TrocaFarma',
    ownerId,
  }
}

async function assertAuthorized(req: Request, supabase: ReturnType<typeof createClient>) {
  const webhookToken = req.headers.get(WEBHOOK_TOKEN_HEADER)
  if (webhookToken && webhookToken === STATUS_BOT_TOKEN) {
    return { source: 'database-webhook' as const, userId: null }
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace(/^Bearer\s+/i, '')

  if (!jwt) {
    return { source: null, userId: null }
  }

  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user) {
    return { source: null, userId: null }
  }

  return { source: 'user' as const, userId: data.user.id }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const auth = await assertAuthorized(req, supabase)

    if (!auth.source) {
      return new Response(JSON.stringify({ ok: false, error: 'usuario nao autenticado' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const payload = await req.json()
    const { filePath, caption, ownerId } = resolvePayload(payload)

    if (!caption) {
      return new Response(
        JSON.stringify({ ok: false, error: 'caption ou record.descricao_customizada e obrigatorio' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    if (auth.source === 'user' && ownerId && ownerId !== auth.userId) {
      return new Response(JSON.stringify({ ok: false, error: 'imagem nao pertence ao usuario autenticado' }), {
        status: 403,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    let imageBase64: string | null = null
    if (filePath) {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('anuncios-fotos')
        .download(filePath)

      if (downloadError || !fileData) {
        console.error('Falha ao baixar imagem do storage:', downloadError)
        return new Response(
          JSON.stringify({ ok: false, error: 'falha ao baixar imagem do storage' }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
        )
      }

      const arrayBuffer = await fileData.arrayBuffer()
      imageBase64 = arrayBufferToBase64(arrayBuffer)
    }

    const result = await postStatusWithRetry(imageBase64, caption)

    if (!result.ok) {
      console.error('Falha ao notificar status bot:', result.error)
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Erro inesperado na edge function:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
