import logoImageUrl from '../assets/logo.png'

export const STATUS_PHONE_DISPLAY = '+55 71 98399-2970'
export const STATUS_PHONE_LINK = 'https://wa.me/5571983992970'

const normalizeLocation = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

export const isSalvadorLocation = ({ cidade, estado }) => {
    const city = normalizeLocation(cidade)
    const state = normalizeLocation(estado)
    return city === 'SALVADOR' && (state === 'BA' || state === 'BAHIA')
}

const roundedRect = (ctx, x, y, width, height, radius, color, stroke = null) => {
    ctx.beginPath()
    ctx.roundRect(x, y, width, height, radius)
    ctx.fillStyle = color
    ctx.fill()
    if (stroke) {
        ctx.strokeStyle = stroke
        ctx.lineWidth = 2
        ctx.stroke()
    }
}

const wrapText = (ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) => {
    const words = String(text || '').split(/\s+/).filter(Boolean)
    let line = ''
    let lines = 0
    for (const word of words) {
        const candidate = line ? `${line} ${word}` : word
        if (line && ctx.measureText(candidate).width > maxWidth) {
            ctx.fillText(line, x, y + lines * lineHeight)
            line = word
            lines += 1
            if (lines >= maxLines) return
        } else line = candidate
    }
    if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight)
}

const loadImage = (src) => new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
})

export const canvasToJpegBlob = (canvas) => new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Falha ao gerar o story.')), 'image/jpeg', 0.92)
})

export const drawUrgencyStory = async (canvas, data) => {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const logo = await loadImage(logoImageUrl)
    canvas.width = 1080
    canvas.height = 1920

    const location = [data.cidade, data.estado].filter(Boolean).join(' · ') || 'Local não informado'
    const deadline = data.urgencia_label || 'Urgente'
    const quantity = data.quantidade || '—'
    const salvador = isSalvadorLocation(data)

    const background = ctx.createLinearGradient(0, 0, 1080, 1920)
    background.addColorStop(0, '#f6f4ff')
    background.addColorStop(0.55, '#ffffff')
    background.addColorStop(1, '#ffe9ec')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, 1080, 1920)

    const glow = ctx.createRadialGradient(920, 120, 20, 920, 120, 420)
    glow.addColorStop(0, 'rgba(220, 38, 38, 0.20)')
    glow.addColorStop(1, 'rgba(220, 38, 38, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(500, 0, 580, 520)

    ctx.shadowColor = 'rgba(43, 87, 217, 0.16)'
    ctx.shadowBlur = 38
    ctx.shadowOffsetY = 18
    roundedRect(ctx, 56, 58, 968, 1804, 46, '#ffffff', '#d7dcff')
    ctx.shadowColor = 'transparent'

    const accent = ctx.createLinearGradient(56, 0, 1024, 0)
    accent.addColorStop(0, '#2b57d9')
    accent.addColorStop(0.55, '#8091f2')
    accent.addColorStop(1, '#dc2626')
    roundedRect(ctx, 56, 58, 968, 12, 7, accent)

    ctx.drawImage(logo, 120, 116, 74, 74)
    ctx.font = 'bold 48px Arial, sans-serif'
    ctx.fillStyle = '#183b91'
    ctx.fillText('trocafarma', 210, 171)

    roundedRect(ctx, 718, 132, 240, 54, 27, '#fff1f2', '#fecdd3')
    ctx.fillStyle = '#be123c'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Alerta automático', 838, 166)

    roundedRect(ctx, 122, 240, 330, 56, 28, '#b91c1c')
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 23px Arial, sans-serif'
    ctx.fillText('RUPTURA URGENTE', 287, 276)

    ctx.fillStyle = '#60709a'
    ctx.font = 'bold 22px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(location, 958, 275)
    ctx.textAlign = 'left'

    ctx.fillStyle = '#07112f'
    ctx.font = 'bold 58px Arial, sans-serif'
    wrapText(ctx, data.item_nome || 'Item em falta', 122, 374, 836, 64, 3)

    ctx.shadowColor = 'rgba(185, 28, 28, 0.16)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 12
    roundedRect(ctx, 122, 575, 836, 390, 38, '#fff1f2', '#fecdd3')
    ctx.shadowColor = 'transparent'

    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.moveTo(540, 630)
    ctx.lineTo(642, 812)
    ctx.lineTo(438, 812)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 96px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('!', 540, 785)
    ctx.fillStyle = '#991b1b'
    ctx.font = 'bold 32px Arial, sans-serif'
    ctx.fillText('ESTOQUE EM RUPTURA', 540, 870)
    ctx.font = '24px Arial, sans-serif'
    ctx.fillText('Precisamos localizar este item com urgência', 540, 914)
    ctx.textAlign = 'left'

    const infoBox = (x, y, label, value, red = false) => {
        roundedRect(ctx, x, y, 408, 124, 24, red ? '#fff1f2' : '#f7f8fe', red ? '#fecdd3' : '#dbe2ff')
        ctx.fillStyle = red ? '#be123c' : '#7b88ad'
        ctx.font = 'bold 18px Arial, sans-serif'
        ctx.fillText(label, x + 26, y + 40)
        ctx.fillStyle = red ? '#991b1b' : '#07112f'
        ctx.font = 'bold 32px Arial, sans-serif'
        wrapText(ctx, value, x + 26, y + 84, 350, 34, 1)
    }

    infoBox(122, 1010, 'QUANTIDADE NECESSÁRIA', `${quantity} unidades`, true)
    infoBox(550, 1010, 'PRECISA ATÉ', deadline, true)
    infoBox(122, 1154, 'CANAL DE NEGOCIAÇÃO', 'Exclusivo TrocaFarma')
    infoBox(550, 1154, 'LOCALIZAÇÃO', location)

    const button = ctx.createLinearGradient(122, 0, 958, 0)
    button.addColorStop(0, '#dc2626')
    button.addColorStop(1, '#b91c1c')
    ctx.shadowColor = 'rgba(185, 28, 28, 0.28)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 14
    roundedRect(ctx, 122, 1515, 836, 112, 34, button)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 39px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Você tem este item?', 540, 1585)

    ctx.fillStyle = '#5f6b8b'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.fillText('Responda este status e ajude a evitar uma ruptura assistencial', 540, 1670)

    if (salvador) {
        ctx.fillStyle = '#991b1b'
        ctx.font = 'bold 21px Arial, sans-serif'
        ctx.fillText('Salve o contato para receber os próximos alertas', 540, 1720)
        ctx.font = 'bold 29px Arial, sans-serif'
        ctx.fillText(STATUS_PHONE_DISPLAY, 540, 1760)
    } else {
        ctx.fillStyle = '#2b57d9'
        ctx.font = 'bold 21px Arial, sans-serif'
        ctx.fillText('Acompanhe sua região em trocafarma.com', 540, 1735)
    }

    ctx.strokeStyle = '#dbe2ff'
    ctx.beginPath()
    ctx.moveTo(122, 1790)
    ctx.lineTo(958, 1790)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#7180a5'
    ctx.font = '20px Arial, sans-serif'
    ctx.fillText('Solicite e anuncie gratuitamente pelo', 122, 1832)
    ctx.fillStyle = '#07112f'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText('TrocaFarma', 446, 1832)
    ctx.fillStyle = '#2b57d9'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('trocafarma.com', 958, 1832)
    ctx.textAlign = 'left'
}

export const buildUrgencyCaption = (data) => [
    'RUPTURA URGENTE - TrocaFarma',
    '',
    data.item_nome,
    `Quantidade necessária: ${data.quantidade}`,
    `Prazo: ${data.urgencia_label}`,
    `Local: ${[data.cidade, data.estado].filter(Boolean).join(' - ')}`,
    '',
    'Você tem este item? Responda este status.'
].filter(Boolean).join('\n')
