// Edge Function server-side que substitui a chamada direta do navegador
// para o bot de Status no Railway. O token do Railway fica em secret aqui
// e nunca chega ao bundle do usuario.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const STATUS_BOT_URL = Deno.env.get('STATUS_BOT_URL')!
const STATUS_BOT_TOKEN = Deno.env.get('STATUS_BOT_TOKEN')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

async function postStatusWithRetry(imageBase64: string, caption: string) {
  const attempt = async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const response = await fetch(STATUS_BOT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': STATUS_BOT_TOKEN,
        },
        body: JSON.stringify({ imageBase64, caption }),
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')

    if (!jwt) {
      return new Response(JSON.stringify({ ok: false, error: 'usuario nao autenticado' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const { data: authData, error: authError } = await supabase.auth.getUser(jwt)

    if (authError || !authData.user) {
      return new Response(JSON.stringify({ ok: false, error: 'usuario nao autenticado' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const { filePath, caption } = await req.json()

    if (!filePath || !caption) {
      return new Response(
        JSON.stringify({ ok: false, error: 'filePath e caption sao obrigatorios' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

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
    const imageBase64 = arrayBufferToBase64(arrayBuffer)
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
