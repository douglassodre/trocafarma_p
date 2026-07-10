import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiService } from '../services/apiService'
import logoImageUrl from '../assets/logo.png'
import {
    ArrowLeft, MapPin, Calendar,
    Package, FileText, Camera, Save,
    Tag, AlertTriangle, CheckCircle, XCircle, Plus, Trash2
} from 'lucide-react'
import Autocomplete from '../components/Autocomplete'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

const MAX_BULK_ITEMS = 20
const EXPIRED_SESSION_MESSAGE = 'Sua sessao expirou. Entre novamente para continuar anunciando.'
const SALVADOR_STATUS_PHONE_DISPLAY = '+55 71 98399-2970'
const SALVADOR_STATUS_PHONE_LINK = 'https://wa.me/5571983992970'

function normalizeLocation(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase()
}

function isSalvadorStatusLocation({ cidade, estado }) {
    const normalizedCity = normalizeLocation(cidade)
    const normalizedState = normalizeLocation(estado)
    return normalizedCity === 'SALVADOR' && (normalizedState === 'BA' || normalizedState === 'BAHIA')
}

const DEFAULT_COMMON_DATA = {
    type: 'DOACAO',
    logistics: 'RETIRADA',
    returnDate: '',
    exchangeItems: '',
    cidade: '',
    estado: ''
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function createDraftId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID()
    }

    return `item_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function createEmptyItem(overrides = {}) {
    return {
        id: createDraftId(),
        itemCode: '',
        description: '',
        category: '',
        quantity: '',
        unitPrice: '',
        batch: '',
        expirationDate: '',
        photos: '',
        previewUrl: null,
        previewReady: false,
        previewError: '',
        previewApproved: false,
        uploadingImage: false,
        ...overrides
    }
}

function mergeForStatus(item, commonData) {
    return {
        ...item,
        type: commonData.type,
        logistics: commonData.logistics,
        returnDate: commonData.returnDate,
        exchangeItems: commonData.exchangeItems,
        cidade: commonData.cidade,
        estado: commonData.estado
    }
}

function isBlobUrl(value) {
    return typeof value === 'string' && value.startsWith('blob:')
}

async function notifyStatusBot({ filePath, caption }) {
    try {
        const { data, error } = await supabase.functions.invoke('notify-status-bot', {
            body: { filePath, caption },
        })

        if (error) {
            console.error('Falha ao invocar notify-status-bot:', error)
            return false
        }

        if (data?.ok === false) {
            console.error('notify-status-bot retornou erro:', data.error)
            return false
        }

        console.info('Anuncio enviado para o Status do WhatsApp.')
        return true
    } catch (err) {
        console.error('Erro inesperado ao notificar status bot:', err)
        return false
    }
}

function formatDate(value) {
    if (!value) return 'Nao informado'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('pt-BR')
}

function buildStatusCaption(formData) {
    const lines = [
        'Medicamento disponivel para troca',
        '',
        formData.description?.trim() || 'Novo anuncio TrocaFarma',
        `Validade: ${formatDate(formData.expirationDate)}`,
        `Lote: ${formData.batch?.trim() || 'Nao informado'}`,
        `Quantidade: ${formData.quantity || 'Nao informada'}`,
        `Tipo: ${formData.type || 'Nao informado'}`,
        `Logistica: ${formData.logistics || 'A combinar'}`,
    ]

    if (formData.cidade || formData.estado) {
        lines.push(`Local: ${[formData.cidade, formData.estado].filter(Boolean).join(' - ')}`)
    }

    lines.push('', 'Tenho interesse? Acesse o TrocaFarma.')
    return lines.join('\n')
}

function formatMonthYear(value) {
    if (!value) return 'MM/AAAA'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'MM/AAAA'
    return date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })
}

function roundedRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2)
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + width - r, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + r)
    ctx.lineTo(x + width, y + height - r)
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
    ctx.lineTo(x + r, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
}

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
    roundedRectPath(ctx, x, y, width, height, radius)
    ctx.fillStyle = fillStyle
    ctx.fill()
}

function strokeRoundedRect(ctx, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
    roundedRectPath(ctx, x, y, width, height, radius)
    ctx.strokeStyle = strokeStyle
    ctx.lineWidth = lineWidth
    ctx.stroke()
}

function drawContainedImage(ctx, image, x, y, width, height) {
    const scale = Math.min(width / image.width, height / image.height)
    const drawWidth = image.width * scale
    const drawHeight = image.height * scale
    const drawX = x + (width - drawWidth) / 2
    const drawY = y + (height - drawHeight) / 2
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight)
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    const paragraphs = String(text || '').split('\n')
    let currentY = y
    let linesUsed = 0

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(Boolean)
        let line = ''

        for (const word of words) {
            const testLine = line ? `${line} ${word}` : word
            if (ctx.measureText(testLine).width > maxWidth && line) {
                ctx.fillText(line, x, currentY)
                currentY += lineHeight
                linesUsed += 1
                line = word

                if (linesUsed >= maxLines) return currentY
            } else {
                line = testLine
            }
        }

        if (line && linesUsed < maxLines) {
            ctx.fillText(line, x, currentY)
            currentY += lineHeight
            linesUsed += 1
        }

        if (linesUsed >= maxLines) return currentY
    }

    return currentY
}

function loadCanvasImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image()
        if (typeof src === 'string' && /^https?:\/\//i.test(src)) {
            image.crossOrigin = 'anonymous'
        }
        image.onload = () => resolve(image)
        image.onerror = reject
        image.src = src
    })
}

function canvasToJpegBlob(canvas) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Falha ao processar imagem no canvas'))
        }, 'image/jpeg', 0.9)
    })
}

async function drawStatusTemplatePreview(canvas, { imageSrc, formData }) {
    const productImage = imageSrc ? await loadCanvasImage(imageSrc) : null
    const logoImage = await loadCanvasImage(logoImageUrl)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas indisponivel')

    canvas.width = 1080
    canvas.height = 1920

    const typeLabels = { DOACAO: 'Doação', EMPRESTIMO: 'Empréstimo', VENDA: 'Venda', TROCA: 'Troca' }
    const logisticsLabels = { RETIRADA: 'Retirada', ENTREGA: 'Entrega', COMBINAR: 'A combinar' }
    const typeLabel = typeLabels[formData.type] || formData.type || 'Disponível'
    const logisticsLabel = logisticsLabels[formData.logistics] || formData.logistics || 'A combinar'
    const location = [formData.cidade, formData.estado].filter(Boolean).join(' · ') || 'Local a combinar'
    const isSalvadorAd = isSalvadorStatusLocation(formData)
    const validityDate = formData.expirationDate ? new Date(`${formData.expirationDate}T12:00:00`) : null
    const validityLabel = validityDate && !Number.isNaN(validityDate.getTime())
        ? validityDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')
        : 'Não informada'
    const quantity = formData.quantity || 'Não informada'
    const quantityLabel = Number(quantity) === 1 ? `${quantity} unidade` : `${quantity} unidades`

    const background = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    background.addColorStop(0, '#f3f5ff')
    background.addColorStop(0.5, '#fbfbff')
    background.addColorStop(1, '#e7ecff')
    ctx.fillStyle = background
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const glow = ctx.createRadialGradient(900, 80, 10, 900, 80, 380)
    glow.addColorStop(0, 'rgba(194, 172, 242, 0.48)')
    glow.addColorStop(1, 'rgba(194, 172, 242, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(520, 0, 560, 500)

    ctx.shadowColor = 'rgba(43, 87, 217, 0.18)'
    ctx.shadowBlur = 38
    ctx.shadowOffsetY = 18
    fillRoundedRect(ctx, 56, 58, 968, 1804, 46, '#ffffff')
    ctx.shadowColor = 'transparent'
    strokeRoundedRect(ctx, 56, 58, 968, 1804, 46, '#cbd5ff', 2)

    const topAccent = ctx.createLinearGradient(75, 0, 1005, 0)
    topAccent.addColorStop(0, '#2b57d9')
    topAccent.addColorStop(1, '#c2acf2')
    ctx.save()
    roundedRectPath(ctx, 56, 58, 968, 12, 8)
    ctx.clip()
    ctx.fillStyle = topAccent
    ctx.fillRect(56, 58, 968, 12)
    ctx.restore()

    ctx.drawImage(logoImage, 120, 116, 74, 74)
    ctx.font = 'bold 48px Arial, sans-serif'
    ctx.fillStyle = '#183b91'
    ctx.fillText('trocafarma', 210, 171)

    fillRoundedRect(ctx, 712, 132, 246, 54, 27, '#eef2ff')
    strokeRoundedRect(ctx, 712, 132, 246, 54, 27, '#cbd5ff', 1)
    ctx.fillStyle = '#4167d9'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Anúncio automático', 835, 166)
    ctx.textAlign = 'left'

    fillRoundedRect(ctx, 122, 240, 390, 54, 27, '#07112f')
    ctx.fillStyle = '#c2acf2'
    ctx.beginPath()
    ctx.arc(148, 267, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px Arial, sans-serif'
    ctx.fillText(`DISPONÍVEL PARA ${typeLabel.toLocaleUpperCase('pt-BR')}`, 166, 275)

    ctx.fillStyle = '#60709a'
    ctx.font = 'bold 22px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(location, 958, 275)
    ctx.textAlign = 'left'

    ctx.fillStyle = '#07112f'
    ctx.font = 'bold 58px Arial, sans-serif'
    drawWrappedText(ctx, formData.description?.trim() || 'Novo anúncio TrocaFarma', 122, 374, 836, 64, 3)

    ctx.shadowColor = 'rgba(43, 87, 217, 0.10)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 12
    fillRoundedRect(ctx, 122, 555, 836, 470, 38, '#f5f7ff')
    ctx.shadowColor = 'transparent'
    strokeRoundedRect(ctx, 122, 555, 836, 470, 38, '#dbe2ff', 1)

    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)'
    ctx.shadowBlur = 24
    ctx.shadowOffsetY = 12
    fillRoundedRect(ctx, 305, 620, 470, 330, 28, '#ffffff')
    ctx.shadowColor = 'transparent'
    ctx.save()
    roundedRectPath(ctx, 325, 640, 430, 290, 18)
    ctx.clip()
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(325, 640, 430, 290)
    if (productImage) drawContainedImage(ctx, productImage, 345, 660, 390, 250)
    else {
        ctx.globalAlpha = 0.55
        ctx.drawImage(logoImage, 465, 700, 150, 150)
        ctx.globalAlpha = 1
    }
    ctx.restore()

    ctx.shadowColor = 'rgba(43, 87, 217, 0.12)'
    ctx.shadowBlur = 18
    ctx.shadowOffsetY = 8
    fillRoundedRect(ctx, 700, 584, 230, 100, 26, '#ffffff')
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#7b88ad'
    ctx.font = 'bold 18px Arial, sans-serif'
    ctx.fillText('VALIDADE', 724, 620)
    ctx.fillStyle = '#2b57d9'
    ctx.font = 'bold 30px Arial, sans-serif'
    ctx.fillText(validityLabel, 724, 658)

    fillRoundedRect(ctx, 152, 954, 294, 42, 21, '#ffffff')
    ctx.fillStyle = '#7583a8'
    ctx.font = 'bold 16px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Foto cadastrada pela instituição', 299, 981)
    ctx.textAlign = 'left'

    const drawInfoBox = (x, y, label, value, accent = false) => {
        fillRoundedRect(ctx, x, y, 408, 118, 24, '#f7f8fe')
        strokeRoundedRect(ctx, x, y, 408, 118, 24, '#dbe2ff', 1)
        ctx.fillStyle = '#7b88ad'
        ctx.font = 'bold 18px Arial, sans-serif'
        ctx.fillText(label, x + 26, y + 39)
        ctx.fillStyle = accent ? '#6d45d8' : '#07112f'
        ctx.font = 'bold 30px Arial, sans-serif'
        ctx.fillText(String(value), x + 26, y + 80)
    }
    drawInfoBox(122, 1060, 'LOTE', formData.batch?.trim() || 'Não informado')
    drawInfoBox(550, 1060, 'QUANTIDADE', quantityLabel)
    drawInfoBox(122, 1198, 'MODALIDADE', typeLabel, true)
    drawInfoBox(550, 1198, 'LOGÍSTICA', logisticsLabel)

    const buttonGradient = ctx.createLinearGradient(122, 0, 958, 0)
    buttonGradient.addColorStop(0, '#4167d9')
    buttonGradient.addColorStop(1, '#2b57d9')
    ctx.shadowColor = 'rgba(43, 87, 217, 0.24)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 14
    fillRoundedRect(ctx, 122, 1590, 836, 104, 32, buttonGradient)
    ctx.shadowColor = 'transparent'
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 40px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tenho interesse', 540, 1655)

    ctx.fillStyle = '#5f6b8b'
    ctx.font = 'bold 20px Arial, sans-serif'
    if (isSalvadorAd) {
        ctx.fillText('Salve o contato e receba os próximos anúncios no Status', 540, 1722)
        ctx.fillStyle = '#2b57d9'
        ctx.font = 'bold 29px Arial, sans-serif'
        ctx.fillText(SALVADOR_STATUS_PHONE_DISPLAY, 540, 1760)
    } else {
        ctx.fillText('Acompanhe os anúncios da sua região em trocafarma.com', 540, 1742)
    }

    ctx.strokeStyle = '#dbe2ff'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(122, 1787)
    ctx.lineTo(958, 1787)
    ctx.stroke()

    ctx.textAlign = 'left'
    ctx.fillStyle = '#7180a5'
    ctx.font = '20px Arial, sans-serif'
    ctx.fillText('Anuncie gratuitamente pelo', 122, 1830)
    ctx.fillStyle = '#07112f'
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillText('TrocaFarma', 356, 1830)
    ctx.fillStyle = '#2b57d9'
    ctx.font = 'bold 21px Arial, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText('trocafarma.com', 958, 1830)
    ctx.textAlign = 'left'

    return canvas
}

function AdItemFields({
    item,
    index,
    totalItems,
    isEditMode,
    commonData,
    onSearch,
    onSelect,
    onFieldChange,
    onImageChange,
    onRemove,
    onPreviewChange,
    setCanvasRef
}) {
    const canvasRef = useRef(null)
    const { id, previewUrl, description, expirationDate, batch, quantity, unitPrice } = item
    const { type, logistics, cidade, estado } = commonData
    const publishesToSalvadorStatus = isSalvadorStatusLocation(commonData)
    const fileInputId = `file-upload-${id}`

    useEffect(() => {
        setCanvasRef(id, canvasRef.current)
        return () => setCanvasRef(id, null)
    }, [id, setCanvasRef])

    useEffect(() => {
        let cancelled = false

        if (!canvasRef.current) {
            onPreviewChange(id, { previewReady: false, previewError: '' })
            return undefined
        }

        onPreviewChange(id, { previewReady: false, previewError: '' })

        drawStatusTemplatePreview(canvasRef.current, {
            imageSrc: previewUrl,
            formData: {
                description,
                expirationDate,
                batch,
                quantity,
                type,
                logistics,
                cidade,
                estado
            },
        }).then(() => {
            if (!cancelled) onPreviewChange(id, { previewReady: true })
        }).catch((err) => {
            console.error('Erro ao montar preview do status:', err)
            if (!cancelled) {
                onPreviewChange(id, {
                    previewError: 'Nao foi possivel montar a previa da imagem.',
                    previewReady: false
                })
            }
        })

        return () => {
            cancelled = true
        }
    }, [
        id,
        previewUrl,
        description,
        expirationDate,
        batch,
        quantity,
        type,
        logistics,
        cidade,
        estado,
        onPreviewChange
    ])

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="text-base font-semibold text-slate-900">Item {index + 1}</h3>
                    <p className="text-sm text-slate-500">Dados especificos deste medicamento.</p>
                </div>
                {!isEditMode && totalItems > 1 && (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 text-red-600 hover:text-red-700"
                        onClick={() => onRemove(id)}
                    >
                        <Trash2 className="h-4 w-4" />
                        Remover
                    </Button>
                )}
            </div>

            <div className="space-y-6">
                <div>
                    <Label className="mb-2 block">Busca de Medicamento</Label>
                    <Autocomplete
                        onSearch={onSearch}
                        onSelect={(selectedItem) => onSelect(id, selectedItem)}
                        placeholder="Digite o nome do medicamento (minimo 3 letras)..."
                        initialValue={description}
                    />
                    <p className="mt-1 text-xs text-slate-500">Digite pelo menos 3 caracteres para buscar na base oficial.</p>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div>
                        <Label className="mb-2 block">Descricao Oficial</Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <FileText className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type="text"
                                name="description"
                                value={description}
                                readOnly
                                disabled
                                className="cursor-not-allowed bg-slate-100 pl-10 text-slate-500"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Categoria</Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Tag className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type="text"
                                name="category"
                                value={item.category}
                                readOnly
                                disabled
                                className="cursor-not-allowed bg-slate-100 pl-10 text-slate-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div>
                        <Label className="mb-2 block">Quantidade</Label>
                        <Input
                            type="number"
                            name="quantity"
                            value={quantity}
                            onChange={(event) => onFieldChange(id, event)}
                            required
                            min="1"
                            placeholder="Qtd"
                        />
                    </div>

                    <div>
                        <Label className="mb-2 block">Lote</Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Package className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type="text"
                                name="batch"
                                value={batch}
                                onChange={(event) => onFieldChange(id, event)}
                                required
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="mb-2 block">Data de Vencimento</Label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                            </div>
                            <Input
                                type="date"
                                name="expirationDate"
                                value={expirationDate}
                                onChange={(event) => onFieldChange(id, event)}
                                required
                                min={new Date().toISOString().split('T')[0]}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-5">
                    <h4 className="mb-4 flex items-center text-sm font-semibold text-emerald-800">
                        <Tag className="mr-2 h-4 w-4" />
                        Valor e Impacto
                    </h4>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <Label className="mb-2 block text-emerald-900">Preco Unitario (R$)</Label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <span className="font-bold text-emerald-600">R$</span>
                                </div>
                                <Input
                                    type="number"
                                    name="unitPrice"
                                    value={unitPrice}
                                    onChange={(event) => onFieldChange(id, event)}
                                    min="0"
                                    step="0.01"
                                    placeholder="0,00"
                                    className="border-emerald-200 pl-10 focus:ring-emerald-500"
                                />
                            </div>
                            <p className="mt-1 text-xs text-emerald-700">Defina o valor de mercado para calcular a economia gerada.</p>
                        </div>
                        <div className="flex flex-col justify-center rounded-lg border border-emerald-100 bg-white p-4">
                            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Valor Total do Estoque</span>
                            <span className="text-2xl font-bold text-emerald-900">
                                {currencyFormatter.format((parseFloat(unitPrice) || 0) * (parseFloat(quantity) || 0))}
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">Foto do Item</Label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <div className="flex flex-col items-center">
                            <div className="relative mb-4 flex h-64 w-full max-w-sm items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-200">
                                {previewUrl ? (
                                    <img
                                        src={previewUrl}
                                        alt="Previa"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center text-slate-400">
                                        <Camera className="mx-auto mb-2 h-12 w-12" />
                                        <span className="text-sm">Nenhuma foto selecionada</span>
                                    </div>
                                )}
                                {item.uploadingImage && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 font-semibold text-white">
                                        Enviando...
                                    </div>
                                )}
                            </div>

                            <div className="relative w-full max-w-sm">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) => onImageChange(id, event)}
                                    className="hidden"
                                    id={fileInputId}
                                />
                                <label
                                    htmlFor={fileInputId}
                                    className="flex w-full cursor-pointer items-center justify-center space-x-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 shadow-sm transition hover:bg-slate-50"
                                >
                                    <Camera className="h-4 w-4" />
                                    <span>{previewUrl ? 'Trocar Foto' : 'Adicionar Foto'}</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <Label className="mb-2 block">Previa do WhatsApp</Label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                        <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <canvas
                                ref={canvasRef}
                                width={1080}
                                height={1920}
                                className="block aspect-[9/16] w-full bg-white"
                                aria-label="Previa visual do post no WhatsApp"
                            />
                            {(!item.previewReady || item.uploadingImage) && (
                                <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-semibold text-slate-700">
                                    {item.uploadingImage ? 'Enviando preview...' : 'Montando preview...'}
                                </div>
                            )}
                        </div>

                        {item.previewError && (
                            <p className="mt-3 text-sm text-red-600">{item.previewError}</p>
                        )}

                        {publishesToSalvadorStatus ? (
                            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                                <p className="font-semibold">Este anúncio será publicado automaticamente no Status do TrocaFarma Salvador.</p>
                                <p className="mt-1">
                                    Salve o número <a href={SALVADOR_STATUS_PHONE_LINK} target="_blank" rel="noreferrer" className="font-bold text-emerald-700 underline">{SALVADOR_STATUS_PHONE_DISPLAY}</a> nos seus contatos para acompanhar este e os próximos anúncios diretamente pelo WhatsApp.
                                </p>
                            </div>
                        ) : (
                            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                Este anúncio não será enviado ao Status {SALVADOR_STATUS_PHONE_DISPLAY}, pois esse canal atende exclusivamente Salvador/BA. O card continuará disponível para compartilhamento.
                            </div>
                        )}

                        <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                            <input
                                type="checkbox"
                                checked={item.previewApproved}
                                onChange={(event) => onPreviewChange(id, { previewApproved: event.target.checked })}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-deep"
                            />
                            <span>Aprovo esta previa para postagem no WhatsApp.</span>
                        </label>
                    </div>
                </div>
            </div>
        </section>
    )
}

const NewAd = () => {
    const { user, userProfile, profileError, refreshProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const itemCanvasRefs = useRef({})
    const blobUrlsRef = useRef(new Set())

    const [loading, setLoading] = useState(false)
    const [blockingCheckLoading, setBlockingCheckLoading] = useState(true)
    const [isBlocked, setIsBlocked] = useState(false)
    const [msgBlocked, setMsgBlocked] = useState('')
    const [locationLoading, setLocationLoading] = useState(false)
    const [locationError, setLocationError] = useState('')
    const [commonData, setCommonData] = useState(DEFAULT_COMMON_DATA)
    const [items, setItems] = useState([createEmptyItem()])
    const [, setSaveToCatalog] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [isEditMode, setIsEditMode] = useState(false)
    const [editingId, setEditingId] = useState(null)

    const updateItem = useCallback((itemId, changes, options = {}) => {
        const resetApproval = options.resetApproval !== false

        setItems(prevItems => prevItems.map(item => (
            item.id === itemId
                ? {
                    ...item,
                    ...changes,
                    ...(resetApproval ? { previewApproved: false, previewReady: false } : {})
                }
                : item
        )))
    }, [])

    const setItemPreviewState = useCallback((itemId, changes) => {
        updateItem(itemId, changes, { resetApproval: false })
    }, [updateItem])

    const setItemCanvasRef = useCallback((itemId, node) => {
        if (node) itemCanvasRefs.current[itemId] = node
        else delete itemCanvasRefs.current[itemId]
    }, [])

    const canCreateType = useCallback((type) => {
        if (userProfile?.role === 'UNIDADE_ADM') return true
        if (type === 'DOACAO') return userProfile?.pode_doar !== false
        if (type === 'EMPRESTIMO') return userProfile?.pode_emprestar !== false
        if (type === 'PERMUTA') return userProfile?.pode_permutar !== false
        return false
    }, [userProfile])

    const getLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationError('Geolocalizacao nao e suportada pelo seu navegador.')
            return
        }

        setLocationLoading(true)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                    const data = await response.json()

                    if (data && data.address) {
                        const city = data.address.city || data.address.town || data.address.village || data.address.municipality || ''
                        const state = data.address.state || ''

                        setCommonData(prev => ({ ...prev, cidade: city, estado: state }))
                    } else {
                        setLocationError('Nao foi possivel determinar a cidade.')
                    }
                } catch (error) {
                    console.error('Error fetching address:', error)
                    setLocationError('Erro ao buscar endereco.')
                } finally {
                    setLocationLoading(false)
                }
            },
            (error) => {
                console.error('Geolocation error:', error)
                let msg = 'Erro ao obter localizacao.'
                if (error.code === error.PERMISSION_DENIED) msg = 'Permissao de localizacao negada.'
                setLocationError(msg)
                setLocationLoading(false)
            }
        )
    }, [])

    useEffect(() => {
        const blobUrls = blobUrlsRef.current

        return () => {
            blobUrls.forEach((url) => URL.revokeObjectURL(url))
            blobUrls.clear()
        }
    }, [])

    useEffect(() => {
        if (!user) {
            setBlockingCheckLoading(false)
            navigate('/signin')
            return
        }

        const adToEdit = location.state?.adToEdit

        if (adToEdit) {
            setCommonData({
                type: adToEdit.tipo || 'DOACAO',
                logistics: adToEdit.logistica || 'RETIRADA',
                returnDate: adToEdit.prazo_devolucao || '',
                exchangeItems: adToEdit.itens_desejados_troca || '',
                cidade: adToEdit.cidade || '',
                estado: adToEdit.estado || ''
            })
            setItems([createEmptyItem({
                id: `edit_${adToEdit.id}`,
                itemCode: adToEdit.item_codigo || '',
                description: adToEdit.descricao_customizada || '',
                category: adToEdit.categoria || 'MEDICAMENTO',
                quantity: adToEdit.quantidade || '',
                unitPrice: adToEdit.preco_unitario || '',
                batch: adToEdit.lote || '',
                expirationDate: adToEdit.data_vencimento || '',
                previewUrl: adToEdit.foto_url || null
            })])
            setIsEditMode(true)
            setEditingId(adToEdit.id)

            if (!adToEdit.cidade) getLocation()
        } else {
            setCommonData(DEFAULT_COMMON_DATA)
            setItems([createEmptyItem()])
            setIsEditMode(false)
            setEditingId(null)
            getLocation()
        }

        const checkBlocking = async () => {
            const today = new Date().toISOString().split('T')[0]

            try {
                const { data, error } = await supabase
                    .from('transacoes')
                    .select('id')
                    .eq('usuario_id', user.id)
                    .is('data_devolucao_real', null)
                    .lt('data_devolucao_prevista', today)

                if (error) {
                    console.error('Error checking blocking status:', error)
                } else if (data && data.length > 0) {
                    setIsBlocked(true)
                    setMsgBlocked('Voce possui pendencias de devolucao e nao pode anunciar novos itens.')
                }
            } catch (err) {
                console.error(err)
            } finally {
                setBlockingCheckLoading(false)
            }
        }

        checkBlocking()
    }, [user, navigate, location.state, getLocation])

    useEffect(() => {
        if (!userProfile || canCreateType(commonData.type)) return

        const fallbackType = ['DOACAO', 'EMPRESTIMO', 'PERMUTA'].find(canCreateType)
        if (!fallbackType) return

        setCommonData(prev => ({ ...prev, type: fallbackType }))
        setItems(prevItems => prevItems.map(item => ({
            ...item,
            previewApproved: false,
            previewReady: false
        })))
    }, [userProfile, commonData.type, canCreateType])

    const handleSearch = useCallback(async (query) => {
        try {
            const result = await apiService.searchMedication(query)
            if (result && result.content) {
                return result.content.map(item => ({
                    label: item.nomeProduto,
                    subLabel: item.numProcesso,
                    value: item
                }))
            }
            return []
        } catch (error) {
            console.error('Search error:', error)
            return []
        }
    }, [])

    const handleCommonChange = (event) => {
        const { name, value } = event.target

        setCommonData(prev => ({ ...prev, [name]: value }))

        if (['type', 'logistics', 'cidade', 'estado'].includes(name)) {
            setItems(prevItems => prevItems.map(item => ({
                ...item,
                previewApproved: false,
                previewReady: false
            })))
        }
    }

    const handleItemFieldChange = useCallback((itemId, event) => {
        const { name, value } = event.target
        updateItem(itemId, { [name]: value })
    }, [updateItem])

    const handleItemSelect = useCallback((itemId, selectedItem) => {
        if (!selectedItem) {
            updateItem(itemId, { description: '', itemCode: '', category: '' })
            return
        }

        const med = selectedItem.value
        updateItem(itemId, {
            description: med.nomeProduto,
            itemCode: med.numProcesso,
            category: 'MEDICAMENTO'
        })
        setSaveToCatalog(true)
        setFeedback('Item selecionado com sucesso.')
    }, [updateItem])

    const handleImageChange = useCallback((itemId, event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const existingItem = items.find(item => item.id === itemId)
        if (isBlobUrl(existingItem?.previewUrl)) {
            URL.revokeObjectURL(existingItem.previewUrl)
            blobUrlsRef.current.delete(existingItem.previewUrl)
        }

        const objectUrl = URL.createObjectURL(file)
        blobUrlsRef.current.add(objectUrl)
        updateItem(itemId, {
            previewUrl: objectUrl,
            previewReady: false,
            previewError: ''
        })
    }, [items, updateItem])

    const handleAddItem = () => {
        setItems(prevItems => {
            if (prevItems.length >= MAX_BULK_ITEMS) {
                setFeedback(`Limite de ${MAX_BULK_ITEMS} itens por envio atingido.`)
                return prevItems
            }

            return [...prevItems, createEmptyItem()]
        })
    }

    const handleRemoveItem = (itemId) => {
        setItems(prevItems => {
            if (prevItems.length <= 1) return prevItems

            const itemToRemove = prevItems.find(item => item.id === itemId)
            if (isBlobUrl(itemToRemove?.previewUrl)) {
                URL.revokeObjectURL(itemToRemove.previewUrl)
                blobUrlsRef.current.delete(itemToRemove.previewUrl)
            }
            delete itemCanvasRefs.current[itemId]

            return prevItems.filter(item => item.id !== itemId)
        })
    }

    const redirectToSignIn = useCallback(async () => {
        await supabase.auth.signOut()
        const redirect = encodeURIComponent(`${location.pathname}${location.search}`)
        navigate(`/signin?redirect=${redirect}`, { replace: true })
    }, [location.pathname, location.search, navigate])

    const ensureActiveProfile = useCallback(async () => {
        const { data: { user: activeUser }, error } = await supabase.auth.getUser()

        if (error || !activeUser) {
            await redirectToSignIn()
            throw new Error(EXPIRED_SESSION_MESSAGE)
        }

        if (user && activeUser.id !== user.id) {
            await redirectToSignIn()
            throw new Error(EXPIRED_SESSION_MESSAGE)
        }

        if (userProfile) return { activeUser, activeProfile: userProfile }

        const activeProfile = await refreshProfile(activeUser.id)
        if (!activeProfile) {
            throw new Error('Nao foi possivel validar seu perfil. Atualize a pagina e tente novamente.')
        }

        return { activeUser, activeProfile }
    }, [redirectToSignIn, refreshProfile, user, userProfile])

    const buildPayload = ({ item, finalPhotoUrl, statusInicial, expirationDateObj, activeUser, activeProfile }) => {
        const unitPrice = parseFloat(item.unitPrice) || 0
        const quantityForTotal = parseFloat(item.quantity) || 0

        return {
            usuario_id: activeUser.id,
            instituicao_id: activeProfile.instituicao_id,
            item_codigo: item.itemCode,
            descricao_customizada: item.description,
            quantidade: item.quantity,
            preco_unitario: unitPrice,
            valor_total_estoque: unitPrice * quantityForTotal,
            lote: item.batch,
            data_vencimento: item.expirationDate,
            tipo: commonData.type,
            prazo_devolucao: commonData.type === 'EMPRESTIMO' ? commonData.returnDate : null,
            itens_desejados_troca: commonData.type === 'PERMUTA' ? commonData.exchangeItems : null,
            logistica: commonData.logistics,
            data_expiracao: expirationDateObj.toISOString(),
            status: statusInicial,
            cidade: commonData.cidade,
            estado: commonData.estado,
            foto_url: finalPhotoUrl
        }
    }

    const validateForm = () => {
        if (!user) {
            return EXPIRED_SESSION_MESSAGE
        }

        if (profileError) {
            return 'Nao foi possivel validar seu perfil. Atualize a pagina e tente novamente.'
        }

        if (!userProfile) {
            return 'Ainda estamos validando seu perfil. Aguarde alguns segundos e tente novamente.'
        }

        if (!commonData.cidade?.trim()) {
            return 'Cidade e obrigatoria. Por favor, libere a localizacao ou preencha manualmente.'
        }

        if (!userProfile?.instituicao_id) {
            return 'Erro: Seu perfil nao esta vinculado a uma instituicao. Apenas instituicoes podem criar anuncios.'
        }

        if (!canCreateType(commonData.type)) {
            return 'Seu usuario nao possui permissao para este tipo de anuncio.'
        }

        if (commonData.type === 'EMPRESTIMO' && !commonData.returnDate) {
            return 'Prazo de devolucao e obrigatorio para emprestimos.'
        }

        if (commonData.type === 'PERMUTA' && !commonData.exchangeItems?.trim()) {
            return 'Itens desejados para troca sao obrigatorios para permuta.'
        }

        if (items.length > MAX_BULK_ITEMS) {
            return `Limite de ${MAX_BULK_ITEMS} itens por envio atingido.`
        }

        const today = new Date().toISOString().split('T')[0]
        const itemsToValidate = isEditMode ? items.slice(0, 1) : items

        for (let index = 0; index < itemsToValidate.length; index += 1) {
            const item = itemsToValidate[index]
            const label = `Item ${index + 1}`

            if (!item.description?.trim()) {
                return `${label}: selecione um medicamento da lista.`
            }

            if (!item.quantity || Number(item.quantity) <= 0) {
                return `${label}: informe uma quantidade valida.`
            }

            if (!item.batch?.trim()) {
                return `${label}: informe o lote.`
            }

            if (!item.expirationDate) {
                return `${label}: informe a data de vencimento.`
            }

            if (item.expirationDate < today) {
                return `${label}: a data de vencimento nao pode ser no passado.`
            }

            if (!item.previewApproved) {
                return `${label}: aprove a previa do WhatsApp antes de salvar o anuncio.`
            }

        }

        return null
    }

    const createStatusPreviewBlob = async (item) => {
        const canvas = itemCanvasRefs.current[item.id] || document.createElement('canvas')
        await drawStatusTemplatePreview(canvas, {
            imageSrc: item.previewUrl,
            formData: {
                description: item.description,
                expirationDate: item.expirationDate,
                batch: item.batch,
                quantity: item.quantity,
                type: commonData.type,
                logistics: commonData.logistics,
                cidade: commonData.cidade,
                estado: commonData.estado
            }
        })

        return canvasToJpegBlob(canvas)
    }

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setFeedback('')

        const validationError = validateForm()
        if (validationError) {
            setFeedback(validationError)
            setLoading(false)
            return
        }

        const uploadedPaths = []

        try {
            const { activeUser, activeProfile } = await ensureActiveProfile()
            const daysToAdd = 30
            const expirationDateObj = new Date()
            expirationDateObj.setDate(expirationDateObj.getDate() + daysToAdd)

            const statusInicial = (activeProfile?.requer_aprovacao === true && activeProfile?.role !== 'UNIDADE_ADM')
                ? 'AGUARDANDO_APROVACAO'
                : 'ATIVO'

            const payloads = []
            const notifications = []
            const itemsToSubmit = isEditMode ? items.slice(0, 1) : items

            for (const item of itemsToSubmit) {
                let finalPhotoUrl = null
                let finalPhotoPath = null

                setItemPreviewState(item.id, { uploadingImage: true })

                try {
                    const processedBlob = await createStatusPreviewBlob(item)
                    const fileName = `${Date.now()}_${item.id}_${Math.random().toString(36).slice(2)}.jpg`
                    const filePath = `${activeUser.id}/${fileName}`

                    const { error: uploadError } = await supabase.storage
                        .from('anuncios-fotos')
                        .upload(filePath, processedBlob, {
                            contentType: 'image/jpeg',
                            upsert: false
                        })

                    if (uploadError) throw uploadError

                    const { data: publicUrlData } = supabase.storage
                        .from('anuncios-fotos')
                        .getPublicUrl(filePath)

                    finalPhotoUrl = publicUrlData.publicUrl
                    finalPhotoPath = filePath
                    uploadedPaths.push(filePath)
                } finally {
                    setItemPreviewState(item.id, { uploadingImage: false })
                }

                payloads.push(buildPayload({
                    item,
                    finalPhotoUrl,
                    statusInicial,
                    expirationDateObj,
                    activeUser,
                    activeProfile
                }))
                notifications.push({
                    filePath: finalPhotoPath,
                    caption: buildStatusCaption(mergeForStatus(item, commonData))
                })
            }

            if (isEditMode && editingId) {
                const { error } = await supabase
                    .from('anuncios')
                    .update(payloads[0])
                    .eq('id', editingId)

                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('anuncios')
                    .insert(payloads)

                if (error) throw error
            }

            let failedWhatsappNotifications = 0
            if (statusInicial === 'ATIVO' && isSalvadorStatusLocation(commonData)) {
                const notificationResults = await Promise.allSettled(
                    notifications.map((notification) => notifyStatusBot(notification))
                )
                failedWhatsappNotifications = notificationResults.filter((result) => (
                    result.status === 'rejected' || result.value !== true
                )).length
            }

            if (statusInicial === 'AGUARDANDO_APROVACAO') {
                alert(isEditMode
                    ? 'Anuncio enviado para aprovacao do Administrador!'
                    : `${payloads.length} anuncio(s) enviado(s) para aprovacao do Administrador!`)
                navigate('/')
            } else {
                const successMessage = isEditMode
                    ? 'Anuncio atualizado com sucesso!'
                    : `${payloads.length} anuncio(s) criado(s) com sucesso!`
                const whatsappWarning = failedWhatsappNotifications > 0
                    ? `\n\nAtencao: ${failedWhatsappNotifications} publicacao(oes) nao foram enviadas ao WhatsApp.`
                    : ''
                alert(`${successMessage}${whatsappWarning}`)
                navigate(isEditMode ? '/meus-anuncios' : '/')
            }
        } catch (err) {
            if (uploadedPaths.length > 0) {
                const { error: cleanupError } = await supabase.storage
                    .from('anuncios-fotos')
                    .remove(uploadedPaths)

                if (cleanupError) {
                    console.error('Erro ao limpar imagens apos falha:', cleanupError)
                }
            }

            console.error(err)
            setFeedback(`Erro ao ${isEditMode ? 'atualizar' : 'criar'} anuncio: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const hasUploadingImage = items.some(item => item.uploadingImage)
    const hasNoAdPermission = userProfile
        && !canCreateType('DOACAO')
        && !canCreateType('EMPRESTIMO')
        && !canCreateType('PERMUTA')
    const feedbackIsError = feedback && !feedback.toLowerCase().includes('sucesso')

    if (blockingCheckLoading) return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="text-gray-500">Verificando...</div>
        </div>
    )

    if (isBlocked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
                <div className="max-w-lg rounded bg-white p-8 text-center shadow">
                    <h2 className="mb-4 text-2xl font-bold text-red-600">Atencao!</h2>
                    <p className="text-gray-700">{msgBlocked}</p>
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="mt-6 rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
                    >
                        Voltar para Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl">
            <Card>
                <CardHeader>
                    <div className="flex items-center space-x-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            type="button"
                            onClick={() => navigate(-1)}
                        >
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <CardTitle>{isEditMode ? 'Editar Anuncio' : 'Novo Anuncio'}</CardTitle>
                            {!isEditMode && (
                                <p className="mt-1 text-sm text-slate-500">
                                    Cadastre varios itens usando os mesmos dados de local, negociacao e logistica.
                                </p>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-8">
                        {feedback && (
                            <div className={`mb-6 flex items-center space-x-3 rounded-lg border p-4 ${feedbackIsError ? 'border-red-100 bg-red-50 text-red-700' : 'border-green-100 bg-green-50 text-green-700'}`}>
                                {feedbackIsError ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                <span>{feedback}</span>
                            </div>
                        )}

                        {locationError && (
                            <div className="mb-6 flex items-start space-x-3 rounded-lg border border-orange-100 bg-orange-50 p-4 text-sm text-orange-700">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>{locationError} <strong>Por favor, preencha a cidade manualmente.</strong></p>
                            </div>
                        )}

                        <section className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                            <h3 className="mb-4 flex items-center text-sm font-semibold text-slate-800">
                                <MapPin className="mr-2 h-4 w-4" />
                                Dados comuns dos anuncios
                            </h3>

                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div className="md:col-span-2">
                                    <Label className="mb-2 block">Cidade</Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            name="cidade"
                                            value={commonData.cidade}
                                            onChange={handleCommonChange}
                                            required
                                            placeholder="Ex: Sao Paulo"
                                            className="pl-3 pr-10"
                                        />
                                        <div className="absolute right-3 top-2.5 text-gray-400">
                                            {locationLoading ? (
                                                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-brand-deep" />
                                            ) : (
                                                <MapPin className="h-4 w-4" />
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-2 block">Estado</Label>
                                    <Input
                                        type="text"
                                        name="estado"
                                        value={commonData.estado}
                                        onChange={handleCommonChange}
                                        maxLength={2}
                                        placeholder="UF"
                                    />
                                </div>
                            </div>

                            <div className="mt-6">
                                <Label className="mb-3 block">Tipo de Negociacao</Label>

                                {hasNoAdPermission && (
                                    <div className="mb-4 rounded-md bg-red-100 p-3 text-sm text-red-800">
                                        Seu usuario nao possui permissao para criar anuncios. Contate o administrador.
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    {canCreateType('DOACAO') && (
                                        <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.type === 'DOACAO' ? 'border-brand-periwinkle bg-brand-lavender/20 text-brand-royal shadow-sm' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                                            <input type="radio" name="type" value="DOACAO" checked={commonData.type === 'DOACAO'} onChange={handleCommonChange} className="sr-only" />
                                            <span className="text-sm font-semibold">Doacao</span>
                                        </label>
                                    )}

                                    {canCreateType('EMPRESTIMO') && (
                                        <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.type === 'EMPRESTIMO' ? 'border-brand-periwinkle bg-brand-lavender/20 text-brand-deep shadow-sm' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                                            <input type="radio" name="type" value="EMPRESTIMO" checked={commonData.type === 'EMPRESTIMO'} onChange={handleCommonChange} className="sr-only" />
                                            <span className="text-sm font-semibold">Emprestimo</span>
                                        </label>
                                    )}

                                    {canCreateType('PERMUTA') && (
                                        <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.type === 'PERMUTA' ? 'border-orange-500 bg-orange-50 text-orange-700 shadow-sm' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
                                            <input type="radio" name="type" value="PERMUTA" checked={commonData.type === 'PERMUTA'} onChange={handleCommonChange} className="sr-only" />
                                            <span className="text-sm font-semibold">Permuta</span>
                                        </label>
                                    )}
                                </div>

                                {commonData.type === 'EMPRESTIMO' && (
                                    <div className="mt-4 animate-fadeIn">
                                        <Label className="mb-2 block">Prazo de Devolucao</Label>
                                        <Input
                                            type="date"
                                            name="returnDate"
                                            value={commonData.returnDate}
                                            onChange={handleCommonChange}
                                            required
                                        />
                                    </div>
                                )}

                                {commonData.type === 'PERMUTA' && (
                                    <div className="mt-4 animate-fadeIn">
                                        <Label className="mb-2 block">Itens Desejados para Troca</Label>
                                        <Textarea
                                            name="exchangeItems"
                                            value={commonData.exchangeItems}
                                            onChange={handleCommonChange}
                                            required
                                            rows={3}
                                            placeholder="Liste o que voce gostaria em troca..."
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="mt-6">
                                <Label className="mb-3 block">Logistica de Entrega</Label>
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                    <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.logistics === 'RETIRADA' ? 'border-slate-400 bg-slate-200 font-semibold' : 'border-slate-300 bg-white hover:bg-slate-100'}`}>
                                        <input type="radio" name="logistics" value="RETIRADA" checked={commonData.logistics === 'RETIRADA'} onChange={handleCommonChange} className="sr-only" />
                                        <span>Retirada no Local</span>
                                    </label>
                                    <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.logistics === 'ENTREGA' ? 'border-slate-400 bg-slate-200 font-semibold' : 'border-slate-300 bg-white hover:bg-slate-100'}`}>
                                        <input type="radio" name="logistics" value="ENTREGA" checked={commonData.logistics === 'ENTREGA'} onChange={handleCommonChange} className="sr-only" />
                                        <span>Entrega Disponivel</span>
                                    </label>
                                    <label className={`cursor-pointer rounded-lg border p-3 text-center transition ${commonData.logistics === 'COMBINAR' ? 'border-slate-400 bg-slate-200 font-semibold' : 'border-slate-300 bg-white hover:bg-slate-100'}`}>
                                        <input type="radio" name="logistics" value="COMBINAR" checked={commonData.logistics === 'COMBINAR'} onChange={handleCommonChange} className="sr-only" />
                                        <span>A Combinar</span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">Itens do envio</h2>
                                    <p className="text-sm text-slate-500">
                                        {isEditMode ? 'Edicao individual do anuncio selecionado.' : `${items.length} de ${MAX_BULK_ITEMS} item(ns) adicionados.`}
                                    </p>
                                </div>
                                {!isEditMode && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="gap-2"
                                        onClick={handleAddItem}
                                        disabled={items.length >= MAX_BULK_ITEMS}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Adicionar item
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-5">
                                {items.map((item, index) => (
                                    <AdItemFields
                                        key={item.id}
                                        item={item}
                                        index={index}
                                        totalItems={items.length}
                                        isEditMode={isEditMode}
                                        commonData={commonData}
                                        onSearch={handleSearch}
                                        onSelect={handleItemSelect}
                                        onFieldChange={handleItemFieldChange}
                                        onImageChange={handleImageChange}
                                        onRemove={handleRemoveItem}
                                        onPreviewChange={setItemPreviewState}
                                        setCanvasRef={setItemCanvasRef}
                                    />
                                ))}
                            </div>
                        </section>
                    </CardContent>

                    <CardFooter className="flex justify-end space-x-3 border-t border-slate-100 p-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => navigate('/')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || hasNoAdPermission}
                        >
                            {loading ? <span className="mr-2 animate-spin">...</span> : <Save className="mr-2 h-4 w-4" />}
                            {loading
                                ? (hasUploadingImage ? 'Enviando Imagens...' : 'Salvando...')
                                : (isEditMode ? 'Atualizar Anuncio' : `Criar ${items.length} Anuncio(s)`)}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}

export default NewAd
