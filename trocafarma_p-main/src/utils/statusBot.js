/**
 * statusBot.js
 *
 * Após o upload de um card de anúncio para o Supabase Storage, baixa os bytes
 * da imagem via SDK (sem depender de URL pública), converte para base64 e
 * envia para o status bot do TrocaFarma.
 *
 * Variáveis de ambiente necessárias (prefixo VITE_ para Vite):
 *   VITE_STATUS_BOT_URL   – ex: https://status.trocafarma.com/post-status
 *   VITE_STATUS_BOT_TOKEN – token de autenticação interno
 */

import { supabase } from '../lib/supabase'

const STATUS_BOT_URL = import.meta.env.VITE_STATUS_BOT_URL
const STATUS_BOT_TOKEN = import.meta.env.VITE_STATUS_BOT_TOKEN

const BUCKET = 'anuncios-fotos'
const RETRY_DELAY_MS = 3000

/**
 * Converte um ArrayBuffer em string base64.
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
function arrayBufferToBase64(buffer) {
  let binary = ''
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Faz um POST para o status bot com retry em erros de timeout ou 5xx.
 *
 * @param {string} imageBase64 – bytes da imagem em base64 (sem prefixo data:...)
 * @param {string} caption     – texto descritivo do anúncio
 * @param {number} attempt     – controle de tentativa (1 = primeira, 2 = retry)
 * @returns {Promise<void>}
 */
async function postToStatusBot(imageBase64, caption, attempt = 1) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000) // 15 s timeout

  try {
    const response = await fetch(STATUS_BOT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': STATUS_BOT_TOKEN,
      },
      body: JSON.stringify({ imageBase64, caption }),
    })

    clearTimeout(timeoutId)

    if (response.status >= 500 && attempt < 2) {
      console.warn(`[statusBot] Servidor retornou ${response.status}. Tentando novamente em ${RETRY_DELAY_MS / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      return postToStatusBot(imageBase64, caption, 2)
    }

    if (!response.ok) {
      console.error(`[statusBot] POST falhou com status ${response.status}.`)
    } else {
      console.info('[statusBot] Card enviado com sucesso.')
    }
  } catch (err) {
    clearTimeout(timeoutId)

    const isTimeout = err.name === 'AbortError'
    if (isTimeout && attempt < 2) {
      console.warn(`[statusBot] Timeout na tentativa ${attempt}. Tentando novamente em ${RETRY_DELAY_MS / 1000}s...`)
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS))
      return postToStatusBot(imageBase64, caption, 2)
    }

    console.error('[statusBot] Erro ao enviar card:', isTimeout ? 'Timeout' : err.message)
  }
}

/**
 * Baixa a imagem do Supabase Storage via SDK (funciona com buckets privados),
 * converte para base64 e envia ao status bot.
 *
 * Nunca lança exceção — uma falha aqui NÃO interrompe o fluxo principal.
 *
 * @param {string} filePath – caminho do arquivo dentro do bucket (ex: "userId/timestamp_abc.jpg")
 * @param {string} caption  – descrição do anúncio para o caption do post
 * @returns {Promise<void>}
 */
export async function notifyStatusBot(filePath, caption) {
  if (!STATUS_BOT_URL || !STATUS_BOT_TOKEN) {
    console.warn('[statusBot] VITE_STATUS_BOT_URL ou VITE_STATUS_BOT_TOKEN não configurados. Notificação ignorada.')
    return
  }

  try {
    // Baixa os bytes via SDK (suporta buckets privados com service-role key)
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(filePath)

    if (downloadError) {
      console.error('[statusBot] Erro ao baixar imagem do Storage:', downloadError.message)
      return
    }

    const arrayBuffer = await blob.arrayBuffer()
    const imageBase64 = arrayBufferToBase64(arrayBuffer)

    await postToStatusBot(imageBase64, caption)
  } catch (err) {
    // Garante que qualquer erro inesperado NÃO quebre o fluxo principal
    console.error('[statusBot] Erro inesperado no notifyStatusBot:', err.message)
  }
}
