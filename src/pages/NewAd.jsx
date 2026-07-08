import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { apiService } from '../services/apiService'
import logoImageUrl from '../assets/logo.png'
import {
    ArrowLeft, MapPin, Search, Calendar,
    Package, FileText, Camera, Save, X, Type,
    RefreshCw, Share2, Tag, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react'
import Autocomplete from '../components/Autocomplete'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Button } from '../components/ui/button'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'

async function notifyStatusBot({ filePath, caption }) {
    try {
        const { data, error } = await supabase.functions.invoke('notify-status-bot', {
            body: { filePath, caption },
        })

        if (error) {
            console.error('Falha ao invocar notify-status-bot:', error)
            return
        }

        if (data?.ok === false) {
            console.error('notify-status-bot retornou erro:', data.error)
            return
        }

        console.info('Anuncio enviado para o Status do WhatsApp.')
    } catch (err) {
        console.error('Erro inesperado ao notificar status bot:', err)
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
    canvas.height = 1350

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height)
    gradient.addColorStop(0, '#ffffff')
    gradient.addColorStop(1, '#f3f5fb')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.shadowColor = 'rgba(31, 41, 55, 0.16)'
    ctx.shadowBlur = 28
    ctx.shadowOffsetY = 12
    fillRoundedRect(ctx, 82, 72, 916, 1200, 42, '#ffffff')
    ctx.shadowColor = 'transparent'
    strokeRoundedRect(ctx, 82, 72, 916, 1200, 42, '#bda9f2', 4)

    ctx.drawImage(logoImage, 490, 42, 100, 100)
    ctx.strokeStyle = '#bda9f2'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(130, 124)
    ctx.lineTo(440, 124)
    ctx.moveTo(640, 124)
    ctx.lineTo(950, 124)
    ctx.stroke()

    ctx.fillStyle = '#111827'
    ctx.font = 'bold 62px Arial, sans-serif'
    drawWrappedText(ctx, 'Medicamento Disponivel para Troca', 150, 230, 470, 70, 3)

    ctx.shadowColor = 'rgba(31, 41, 55, 0.22)'
    ctx.shadowBlur = 20
    ctx.shadowOffsetY = 10
    fillRoundedRect(ctx, 720, 162, 220, 160, 34, '#ffffff')
    ctx.shadowColor = 'transparent'
    ctx.drawImage(logoImage, 790, 172, 80, 80)
    ctx.fillStyle = '#111827'
    ctx.font = '28px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Selo Validade:', 830, 280)
    ctx.fillText(formatMonthYear(formData.expirationDate), 830, 316)
    ctx.textAlign = 'left'

    ctx.shadowColor = 'rgba(31, 41, 55, 0.18)'
    ctx.shadowBlur = 22
    ctx.shadowOffsetY = 12
    fillRoundedRect(ctx, 150, 360, 780, 420, 34, '#ffffff')
    ctx.shadowColor = 'transparent'
    strokeRoundedRect(ctx, 150, 360, 780, 420, 34, '#eef0f7', 3)

    ctx.save()
    roundedRectPath(ctx, 172, 382, 736, 376, 24)
    ctx.clip()
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(172, 382, 736, 376)
    if (productImage) {
        drawContainedImage(ctx, productImage, 190, 400, 700, 340)
    } else {
        ctx.drawImage(logoImage, 430, 455, 220, 220)
        ctx.fillStyle = '#64748b'
        ctx.font = '34px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Sem foto do item', 540, 710)
        ctx.textAlign = 'left'
    }
    ctx.restore()

    ctx.fillStyle = '#111827'
    ctx.font = '38px Arial, sans-serif'
    const details = [
        formData.description?.trim() || 'Novo anuncio TrocaFarma',
        `Validade: ${formatDate(formData.expirationDate)} | Lote: ${formData.batch?.trim() || 'Nao informado'}`,
        `Quantidade: ${formData.quantity || 'Nao informada'} | Tipo: ${formData.type || 'Nao informado'}`,
        `Logistica: ${formData.logistics || 'A combinar'}`,
        formData.cidade || formData.estado
            ? `Local: ${[formData.cidade, formData.estado].filter(Boolean).join(' - ')}`
            : '',
    ].filter(Boolean).join('\n')
    drawWrappedText(ctx, details, 150, 860, 780, 50, 7)

    const buttonGradient = ctx.createLinearGradient(150, 1080, 930, 1080)
    buttonGradient.addColorStop(0, '#4167d9')
    buttonGradient.addColorStop(1, '#2452d6')
    fillRoundedRect(ctx, 150, 1080, 780, 112, 56, buttonGradient)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 44px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Tenho Interesse', 540, 1152)
    ctx.textAlign = 'left'

    ctx.drawImage(logoImage, 500, 1210, 80, 80)
    ctx.strokeStyle = '#bda9f2'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(130, 1248)
    ctx.lineTo(470, 1248)
    ctx.moveTo(610, 1248)
    ctx.lineTo(950, 1248)
    ctx.stroke()

    ctx.fillStyle = '#111827'
    ctx.font = '32px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Anuncie gratuitamente pelo TrocaFarma', 540, 1310)
    ctx.textAlign = 'left'

    return canvas
}

const NewAd = () => {
    const { user, userProfile } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const statusPreviewCanvasRef = useRef(null)

    const [loading, setLoading] = useState(false)
    const [blockingCheckLoading, setBlockingCheckLoading] = useState(true)
    const [isBlocked, setIsBlocked] = useState(false)
    const [msgBlocked, setMsgBlocked] = useState('')

    // Location State
    const [locationLoading, setLocationLoading] = useState(false)
    const [locationError, setLocationError] = useState('')

    // Form State
    const [formData, setFormData] = useState({
        itemCode: '',
        description: '',
        category: '', // New field
        quantity: '', // New quantity field
        unitPrice: '', // New unit price field
        batch: '',
        expirationDate: '',
        type: 'DOACAO', // DOACAO, EMPRESTIMO, PERMUTA
        logistics: 'RETIRADA', // RETIRADA, ENTREGA, COMBINAR
        returnDate: '',
        exchangeItems: '',
        photos: '', // URL or just text for now? Assuming text/url for simplicity or file upload later.
        cidade: '',
        estado: ''
    })

    // Logic State
    const [, setSaveToCatalog] = useState(false)
    const [feedback, setFeedback] = useState('')
    const [isEditMode, setIsEditMode] = useState(false)
    const [editingId, setEditingId] = useState(null)

    // Image Upload State
    const [previewUrl, setPreviewUrl] = useState(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [previewReady, setPreviewReady] = useState(false)
    const [previewError, setPreviewError] = useState('')
    const [previewApproved, setPreviewApproved] = useState(false)

    // 1. Verificação de Bloqueio & Auth & Geolocation & Edit Mode
    useEffect(() => {
        if (!user) {
            setBlockingCheckLoading(false) // Ensure loading is set to false even if no user
            navigate('/signin')
            return
        }

        // Check for Edit Mode
        if (location.state?.adToEdit) {
            const ad = location.state.adToEdit
            setFormData({
                itemCode: ad.item_codigo || '',
                description: ad.descricao_customizada || '',
                category: ad.categoria || 'MEDICAMENTO', // Default if missing
                quantity: ad.quantidade || '',
                unitPrice: ad.preco_unitario || '',
                batch: ad.lote || '',
                expirationDate: ad.data_vencimento || '',
                type: ad.tipo || 'DOACAO',
                logistics: ad.logistica || 'RETIRADA',
                returnDate: ad.prazo_devolucao || '',
                exchangeItems: ad.itens_desejados_troca || '',
                photos: '', // We don't populate the file input, but we could show the existing URL
                cidade: ad.cidade || '',
                estado: ad.estado || ''
            })
            if (ad.foto_url) {
                setPreviewUrl(ad.foto_url)
            }
            setIsEditMode(true)
            setEditingId(ad.id)

            // If editing, we assume city/state are already there, but we could still fetch if missing.
            // For now, let's respect the existing data.
            if (!ad.cidade) getLocation()
        } else {
            getLocation()
        }

        const checkBlocking = async () => {
            const today = new Date().toISOString().split('T')[0]

            try {
                // Check for overdue returns
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
                    setMsgBlocked('Você possui pendências de devolução e não pode anunciar novos itens.')
                }
            } catch (err) {
                console.error(err)
            } finally {
                setBlockingCheckLoading(false)
            }
        }

        checkBlocking()
    }, [user, navigate, location.state])

    useEffect(() => {
        setPreviewApproved(false)
    }, [
        formData.description,
        formData.expirationDate,
        formData.batch,
        formData.quantity,
        formData.type,
        formData.logistics,
        formData.cidade,
        formData.estado,
        previewUrl,
    ])

    useEffect(() => {
        let cancelled = false

        if (!previewUrl || !statusPreviewCanvasRef.current) {
            setPreviewReady(false)
            setPreviewError('')
            return undefined
        }

        setPreviewReady(false)
        setPreviewError('')

        drawStatusTemplatePreview(statusPreviewCanvasRef.current, {
            imageSrc: previewUrl,
            formData,
        }).then(() => {
            if (!cancelled) setPreviewReady(true)
        }).catch((err) => {
            console.error('Erro ao montar preview do status:', err)
            if (!cancelled) {
                setPreviewError('Nao foi possivel montar a previa da imagem.')
                setPreviewReady(false)
            }
        })

        return () => {
            cancelled = true
        }
    }, [previewUrl, formData])

    useEffect(() => {
        return () => {
            if (previewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const getLocation = () => {
        if (!navigator.geolocation) {
            setLocationError('Geolocalização não é suportada pelo seu navegador.')
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

                        setFormData(prev => ({ ...prev, cidade: city, estado: state }))
                    } else {
                        setLocationError('Não foi possível determinar a cidade.')
                    }
                } catch (error) {
                    console.error('Error fetching address:', error)
                    setLocationError('Erro ao buscar endereço.')
                } finally {
                    setLocationLoading(false)
                }
            },
            (error) => {
                console.error('Geolocation error:', error)
                let msg = 'Erro ao obter localização.'
                if (error.code === error.PERMISSION_DENIED) msg = 'Permissão de localização negada.'
                setLocationError(msg)
                setLocationLoading(false)
            }
        )
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            const objectUrl = URL.createObjectURL(file)
            setPreviewUrl(objectUrl)
        }
    }

    // Wrapper for Autocomplete
    const handleSearch = async (query) => {
        try {
            // apiService now searches internally in catalogo_itens
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
    }

    const handleSelect = (item) => {
        if (!item) {
            // Clear fields if selection is cleared
            setFormData(prev => ({ ...prev, description: '', itemCode: '', category: '' }))
            return
        }

        const med = item.value
        setFormData(prev => ({
            ...prev,
            description: med.nomeProduto,
            itemCode: med.numProcesso,
            category: 'MEDICAMENTO' // Auto-fill category
        }))
        setSaveToCatalog(true)
        setFeedback('Item selecionado com sucesso.')
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setFeedback('')

        // Ensure description is filled (validation usually done by HTML 'required' or disabled button, but double check)
        if (!formData.description) {
            setFeedback('Por favor, selecione um medicamento da lista.')
            setLoading(false)
            return
        }

        if (!previewApproved) {
            setFeedback('Aprove a previa do WhatsApp antes de salvar o anuncio.')
            setLoading(false)
            return
        }

        // Validations
        const today = new Date().toISOString().split('T')[0]
        if (formData.expirationDate < today) {
            setFeedback('A data de vencimento não pode ser no passado.')
            setLoading(false)
            return
        }

        if (!formData.cidade) {
            setFeedback('Cidade é obrigatória. Por favor, libere a localização ou preencha manualmente.')
            setLoading(false)
            return
        }

        // Check for Institution Link
        if (!userProfile?.instituicao_id) {
            setFeedback('Erro: Seu perfil não está vinculado a uma instituição. Apenas instituições podem criar anúncios.')
            setLoading(false)
            return
        }

        // Type Specific Checks
        if (formData.type === 'EMPRESTIMO' && !formData.returnDate) {
            setFeedback('Prazo de devolução é obrigatório para empréstimos.')
            setLoading(false)
            return
        }
        if (formData.type === 'PERMUTA' && !formData.exchangeItems) {
            setFeedback('Itens desejados para troca são obrigatórios para permuta.')
            setLoading(false)
            return
        }

        try {
            // 3. Persist Logic
            // 3. Persist Logic
            // Note: We are now SELECTING from catalogo_itens, so no need to save back to it unless we allow new entries.
            // Current requirement is STRICT catalog. So skip insert.

            let finalPhotoUrl = null
            let finalPhotoPath = null

            // Upload the exact preview approved by the user when the post has media.
            if (previewUrl) {
                setUploadingImage(true)
                try {
                    if (!statusPreviewCanvasRef.current || !previewReady) {
                        throw new Error('Preview ainda nao esta pronto')
                    }

                    const processedBlob = await canvasToJpegBlob(statusPreviewCanvasRef.current)
                    const fileExt = 'jpg' // We converted to jpeg
                    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
                    const filePath = `${user.id}/${fileName}`

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
                } catch (uploadErr) {
                    console.error("Erro no upload:", uploadErr)
                    setFeedback("Erro ao enviar imagem. Tente novamente.")
                    setLoading(false)
                    setUploadingImage(false)
                    return
                }
                setUploadingImage(false)
            }


            // Calculate Ad Expiration
            // Calculate Ad Expiration
            const daysToAdd = 30
            const expirationDateObj = new Date()
            expirationDateObj.setDate(expirationDateObj.getDate() + daysToAdd)

            const statusInicial = (userProfile?.requer_aprovacao === true && userProfile?.role !== 'UNIDADE_ADM')
                ? 'AGUARDANDO_APROVACAO'
                : 'ATIVO';

            const payload = {
                usuario_id: user.id,
                instituicao_id: userProfile.instituicao_id,
                item_codigo: formData.itemCode,
                descricao_customizada: formData.description,
                quantidade: formData.quantity, // Added quantity
                preco_unitario: formData.unitPrice || 0,
                valor_total_estoque: (formData.unitPrice || 0) * (formData.quantity || 0),
                lote: formData.batch,
                data_vencimento: formData.expirationDate,
                tipo: formData.type,
                prazo_devolucao: formData.type === 'EMPRESTIMO' ? formData.returnDate : null,
                itens_desejados_troca: formData.type === 'PERMUTA' ? formData.exchangeItems : null,
                logistica: formData.logistics,
                data_expiracao: expirationDateObj.toISOString(),
                status: statusInicial, // Use dynamic status
                cidade: formData.cidade,
                estado: formData.estado,
                foto_url: finalPhotoUrl
            }

            let error = null

            if (isEditMode && editingId) {
                const { error: updateError } = await supabase
                    .from('anuncios')
                    .update(payload)
                    .eq('id', editingId)
                error = updateError
            } else {
                const { error: insertError } = await supabase
                    .from('anuncios')
                    .insert([payload])
                error = insertError
            }

            if (error) throw error

            if (statusInicial === 'ATIVO') {
                notifyStatusBot({
                    filePath: finalPhotoPath,
                    caption: buildStatusCaption(formData),
                })
            }

            if (statusInicial === 'AGUARDANDO_APROVACAO') {
                alert('Anúncio enviado para aprovação do Administrador!')
                navigate('/')
            } else {
                alert(isEditMode ? 'Anúncio atualizado com sucesso!' : 'Anúncio criado com sucesso!')
                navigate(isEditMode ? '/meus-anuncios' : '/')
            }

        } catch (err) {
            console.error(err)
            setFeedback('Erro ao criar anúncio: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    if (blockingCheckLoading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-gray-500">Verificando...</div>
        </div>
    )

    if (isBlocked) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded shadow text-center max-w-lg">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">Atenção!</h2>
                    <p className="text-gray-700">{msgBlocked}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-6 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Voltar para Home
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto">
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
                        <CardTitle>{isEditMode ? 'Editar Anúncio' : 'Novo Anúncio'}</CardTitle>
                    </div>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-8">

                        {feedback && (
                            <div className={`mb-6 p-4 rounded-lg flex items-center space-x-3 ${feedback.includes('Erro') || feedback.includes('passado') || feedback.includes('obrigatório') || feedback.includes('Cidade') ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                                {feedback.includes('Erro') ? <XCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                <span>{feedback}</span>
                            </div>
                        )}

                        {locationError && (
                            <div className="mb-6 p-4 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 text-sm flex items-start space-x-3">
                                <AlertTriangle className="h-5 w-5 shrink-0" />
                                <p>{locationError} <strong>Por favor, preencha a cidade manualmente.</strong></p>
                            </div>
                        )}
                        {/* Location Info - Editable but auto-filled */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center">
                                <MapPin className="h-4 w-4 mr-2" />
                                Localização do Item
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <Label className="mb-2 block">Cidade</Label>
                                    <div className="relative">
                                        <Input
                                            type="text"
                                            name="cidade"
                                            value={formData.cidade}
                                            onChange={handleChange}
                                            required
                                            placeholder="Ex: São Paulo"
                                            className="pl-3 pr-10"
                                        />
                                        <div className="absolute right-3 top-2.5 text-gray-400">
                                            {locationLoading ? (
                                                <div className="animate-spin h-4 w-4 border-b-2 border-blue-600 rounded-full"></div>
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
                                        value={formData.estado}
                                        onChange={handleChange}
                                        maxLength={2}
                                        placeholder="UF"
                                    />
                                </div>
                            </div>
                        </div>


                        {/* Item Identification */}
                        <div>
                            <Label className="mb-2 block">Busca de Medicamento</Label>
                            <Autocomplete
                                onSearch={handleSearch}
                                onSelect={handleSelect}
                                placeholder="Digite o nome do medicamento (mínimo 3 letras)..."
                                initialValue={formData.description}
                            />
                            <p className="mt-1 text-xs text-slate-500">Digite pelo menos 3 caracteres para buscar na base oficial.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <Label className="mb-2 block">Descrição Oficial</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FileText className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        type="text"
                                        name="description"
                                        value={formData.description}
                                        readOnly={true}
                                        disabled={true}
                                        className="pl-10 bg-slate-100 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">Categoria</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Tag className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        type="text"
                                        name="category"
                                        value={formData.category}
                                        readOnly={true}
                                        disabled={true}
                                        className="pl-10 bg-slate-100 text-slate-500 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Label className="mb-2 block">Quantidade</Label>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        required
                                        min="1"
                                        placeholder="Qtd"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-2 block">Lote</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Package className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        type="text"
                                        name="batch"
                                        value={formData.batch}
                                        onChange={handleChange}
                                        required
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="mb-2 block">Data de Vencimento</Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <Input
                                        type="date"
                                        name="expirationDate"
                                        value={formData.expirationDate}
                                        onChange={handleChange}
                                        required
                                        min={new Date().toISOString().split('T')[0]}
                                        className="pl-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Financials - Dedicated Section */}
                        <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                            <h3 className="text-sm font-semibold text-emerald-800 mb-4 flex items-center">
                                <Tag className="h-4 w-4 mr-2" />
                                Valor e Impacto
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <Label className="mb-2 block text-emerald-900">Preço Unitário (R$)</Label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-emerald-600 font-bold">R$</span>
                                        </div>
                                        <Input
                                            type="number"
                                            name="unitPrice"
                                            value={formData.unitPrice}
                                            onChange={handleChange}
                                            min="0"
                                            step="0.01"
                                            placeholder="0,00"
                                            className="pl-10 border-emerald-200 focus:ring-emerald-500"
                                        />
                                    </div>
                                    <p className="text-xs text-emerald-700 mt-1">Defina o valor de mercado para calcular a economia gerada.</p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-emerald-100 flex flex-col justify-center">
                                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Valor Total do Estoque</span>
                                    <span className="text-2xl font-bold text-emerald-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                            (parseFloat(formData.unitPrice) || 0) * (parseFloat(formData.quantity) || 0)
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Type Logic */}
                        {/* Type Logic */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <Label className="mb-3 block">Tipo de Negociação</Label>

                            {/* Alert if permissions are restricted */}
                            {(!userProfile?.pode_doar && !userProfile?.pode_emprestar && !userProfile?.pode_permutar && userProfile?.role !== 'UNIDADE_ADM') && (
                                <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md text-sm">
                                    Seu usuário não possui permissão para criar anúncios. Contate o administrador.
                                </div>
                            )}

                            <div className="flex items-center space-x-4">
                                {(userProfile?.pode_doar !== false || userProfile?.role === 'UNIDADE_ADM') && (
                                    <label className={`cursor-pointer border rounded-lg p-3 flex-1 text-center transition ${formData.type === 'DOACAO' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                        <input type="radio" name="type" value="DOACAO" checked={formData.type === 'DOACAO'} onChange={handleChange} className="sr-only" />
                                        <span className="font-semibold text-sm">Doação</span>
                                    </label>
                                )}

                                {(userProfile?.pode_emprestar !== false || userProfile?.role === 'UNIDADE_ADM') && (
                                    <label className={`cursor-pointer border rounded-lg p-3 flex-1 text-center transition ${formData.type === 'EMPRESTIMO' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                        <input type="radio" name="type" value="EMPRESTIMO" checked={formData.type === 'EMPRESTIMO'} onChange={handleChange} className="sr-only" />
                                        <span className="font-semibold text-sm">Empréstimo</span>
                                    </label>
                                )}

                                {(userProfile?.pode_permutar !== false || userProfile?.role === 'UNIDADE_ADM') && (
                                    <label className={`cursor-pointer border rounded-lg p-3 flex-1 text-center transition ${formData.type === 'PERMUTA' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                                        <input type="radio" name="type" value="PERMUTA" checked={formData.type === 'PERMUTA'} onChange={handleChange} className="sr-only" />
                                        <span className="font-semibold text-sm">Permuta</span>
                                    </label>
                                )}
                            </div>


                            {formData.type === 'EMPRESTIMO' && (
                                <div className="mt-4 animate-fadeIn">
                                    <Label className="mb-2 block">Prazo de Devolução</Label>
                                    <Input
                                        type="date"
                                        name="returnDate"
                                        value={formData.returnDate}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            )}

                            {formData.type === 'PERMUTA' && (
                                <div className="mt-4 animate-fadeIn">
                                    <Label className="mb-2 block">Itens Desejados para Troca</Label>
                                    <Textarea
                                        name="exchangeItems"
                                        value={formData.exchangeItems}
                                        onChange={handleChange}
                                        required
                                        rows={3}
                                        placeholder="Liste o que você gostaria em troca..."
                                    />
                                </div>
                            )}
                        </div>

                        {/* Logistics */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <Label className="mb-3 block">Logística de Entrega</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${formData.logistics === 'RETIRADA' ? 'bg-slate-200 border-slate-400 font-semibold' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>
                                    <input type="radio" name="logistics" value="RETIRADA" checked={formData.logistics === 'RETIRADA'} onChange={handleChange} className="sr-only" />
                                    <span>Retirada no Local</span>
                                </label>
                                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${formData.logistics === 'ENTREGA' ? 'bg-slate-200 border-slate-400 font-semibold' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>
                                    <input type="radio" name="logistics" value="ENTREGA" checked={formData.logistics === 'ENTREGA'} onChange={handleChange} className="sr-only" />
                                    <span>Entrega Disponível</span>
                                </label>
                                <label className={`cursor-pointer border rounded-lg p-3 text-center transition ${formData.logistics === 'COMBINAR' ? 'bg-slate-200 border-slate-400 font-semibold' : 'bg-white border-slate-300 hover:bg-slate-100'}`}>
                                    <input type="radio" name="logistics" value="COMBINAR" checked={formData.logistics === 'COMBINAR'} onChange={handleChange} className="sr-only" />
                                    <span>A Combinar</span>
                                </label>
                            </div>
                        </div>

                        <div>
                            <Label className="mb-2 block">Foto do Item</Label>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                <div className="flex flex-col items-center">
                                    {/* Preview Area */}
                                    <div className="w-full max-w-sm h-64 bg-slate-200 rounded-lg mb-4 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 relative">
                                        {previewUrl ? (
                                            <img
                                                src={previewUrl}
                                                alt="Prévia"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="text-center text-slate-400">
                                                <Camera className="h-12 w-12 mx-auto mb-2" />
                                                <span className="text-sm">Nenhuma foto selecionada</span>
                                            </div>
                                        )}
                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-semibold">
                                                Enviando...
                                            </div>
                                        )}
                                    </div>

                                    {/* File Input */}
                                    <div className="relative w-full max-w-sm">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageChange}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-300 text-slate-700 py-2 px-4 rounded-lg cursor-pointer hover:bg-slate-50 transition shadow-sm"
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
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                                {previewUrl ? (
                                    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                                        <canvas
                                            ref={statusPreviewCanvasRef}
                                            width={1080}
                                            height={1350}
                                            className="block aspect-[4/5] w-full bg-white"
                                            aria-label="Previa visual do post no WhatsApp"
                                        />
                                        {(!previewReady || uploadingImage) && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-semibold text-slate-700">
                                                {uploadingImage ? 'Enviando preview...' : 'Montando preview...'}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mx-auto w-full max-w-md rounded-xl bg-[#efeae2] p-4">
                                        <div className="ml-auto max-w-[92%] rounded-lg bg-[#d9fdd3] p-3 text-sm leading-relaxed text-slate-900 shadow-sm whitespace-pre-line">
                                            {buildStatusCaption(formData)}
                                        </div>
                                    </div>
                                )}

                                {previewError && (
                                    <p className="mt-3 text-sm text-red-600">{previewError}</p>
                                )}

                                <label className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">
                                    <input
                                        type="checkbox"
                                        checked={previewApproved}
                                        onChange={(event) => setPreviewApproved(event.target.checked)}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
                                    />
                                    <span>Aprovo esta previa para postagem no WhatsApp.</span>
                                </label>
                            </div>
                        </div>

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
                            disabled={loading || !formData.description || !previewApproved || Boolean(previewUrl && !previewReady)}
                        >
                            {loading ? <span className="animate-spin mr-2">⏳</span> : <Save className="h-4 w-4 mr-2" />}
                            {loading ? (uploadingImage ? 'Enviando Imagem...' : 'Salvando...') : (isEditMode ? 'Atualizar Anúncio' : 'Criar Anúncio')}
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div >
    )
}

export default NewAd
