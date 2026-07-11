import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Truck, User, Coins, Calendar, RefreshCw, Package, Phone, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const UrgencyResponseModal = ({ urgencyId, onClose, currentUser }) => {
    const [urgency, setUrgency] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        type: 'DOACAO', // DOACAO, EMPRESTIMO, PERMUTA
        unitPrice: '',
        lote: '',

        validade: '',
        returnDate: '',
        exchangeItems: '',
        quantity: '',
        logistics: 'A COMBINAR'
    });

    useEffect(() => {
        if (urgency) {
            setFormData(prev => ({ ...prev, quantity: urgency.quantidade }));
        }
    }, [urgency]);

    useEffect(() => {
        if (urgencyId) fetchUrgencyDetails();
    }, [urgencyId]);

    const fetchUrgencyDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('solicitacoes_urgentes')
                .select('*')
                .eq('id', urgencyId)
                .single();

            if (error) throw error;

            let profileWhatsapp = '';
            if (data?.usuario_id) {
                const { data: profile, error: profileError } = await supabase
                    .from('perfis_usuarios')
                    .select('whatsapp')
                    .eq('id', data.usuario_id)
                    .maybeSingle();

                if (profileError) {
                    console.warn('Nao foi possivel carregar WhatsApp do solicitante:', profileError);
                } else {
                    profileWhatsapp = profile?.whatsapp || '';
                }
            }

            setUrgency({
                ...data,
                contato_whatsapp: data?.contato_whatsapp || profileWhatsapp
            });
        } catch (err) {
            console.error(err);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Currency Mask Helpers
    const formatCurrency = (value) => {
        if (!value) return '';
        const number = value.replace(/\D/g, ''); // Remove non-digits
        const amount = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2
        }).format(number / 100);
        return amount;
    };

    const parseCurrency = (value) => {
        if (!value) return 0;
        const cleanString = value.replace(/\D/g, '');
        return parseFloat(cleanString) / 100;
    };

    const formatWhatsAppUrl = (whatsapp) => {
        const digits = String(whatsapp || '').replace(/\D/g, '');
        if (!digits) return '';
        const normalized = digits.startsWith('55') ? digits : `55${digits}`;
        const message = encodeURIComponent(`Ola, confirmei atendimento para a urgencia do item ${urgency?.item_nome || ''} no Trocafarma.`);
        return `https://wa.me/${normalized}?text=${message}`;
    };

    const handlePriceChange = (e) => {
        const rawValue = e.target.value;
        const formatted = formatCurrency(rawValue);
        setFormData({ ...formData, unitPrice: formatted });
    };

    const handleConfirmMatch = async () => {
        if (!urgency) return;

        // Basic Validation
        if (!formData.unitPrice) {
            alert("Por favor, informe o preço unitário (ou custo) do item.");
            return;
        }

        if (!formData.quantity || formData.quantity <= 0) {
            alert("Por favor, informe uma quantidade válida.");
            return;
        }

        const numericPrice = parseCurrency(formData.unitPrice);

        if (!formData.lote) {
            alert("Por favor, informe o número do lote.");
            return;
        }
        if (!formData.validade) {
            alert("Por favor, informe a data de validade.");
            return;
        }
        if (formData.type === 'EMPRESTIMO' && !formData.returnDate) {
            alert("Por favor, informe o prazo de devolução.");
            return;
        }
        if (formData.type === 'PERMUTA' && !formData.exchangeItems) {
            alert("Por favor, informe os itens desejados para troca.");
            return;
        }

        setProcessing(true);
        try {
            // 1. Create Hidden Ad (Status: RESERVADO_MATCH)
            // This ensures we have a base for the transaction and fees
            const adPayload = {
                usuario_id: currentUser.id,
                instituicao_id: currentUser.user_metadata?.instituicao_id || null,
                item_codigo: urgency.item_codigo || 'GENERIC',
                descricao_customizada: `[URGÊNCIA] ${urgency.item_nome}`,
                quantidade: formData.quantity,
                preco_unitario: numericPrice,
                valor_total_estoque: numericPrice * formData.quantity,
                lote: formData.lote,
                data_vencimento: formData.validade,
                tipo: formData.type,
                prazo_devolucao: formData.type === 'EMPRESTIMO' ? formData.returnDate : null,
                itens_desejados_troca: formData.type === 'PERMUTA' ? formData.exchangeItems : null,
                status: 'RESERVADO_MATCH', // Special status indicating it was created for a specific match
                cidade: 'N/A', // Context specific, could fetch from profile but not blocking
                estado: 'UF',
                logistica: formData.logistics
            };

            // Allow fetch of existing profile to get instituicao_id if valid
            if (!adPayload.instituicao_id) {
                const { data: profile } = await supabase.from('perfis_usuarios').select('instituicao_id').eq('id', currentUser.id).single();
                if (profile) adPayload.instituicao_id = profile.instituicao_id;
            }

            const { data: newAd, error: adError } = await supabase
                .from('anuncios')
                .insert([adPayload])
                .select()
                .single();

            if (adError) throw adError;

            // 2. Registra a resposta diretamente na ruptura. Rupturas não geram
            // taxa de sucesso no Stripe: elas fazem parte da assinatura.
            const { error: transactionError } = await supabase
                .from('transacoes')
                .insert([{
                    anuncio_id: newAd.id,
                    urgencia_id: urgency.id,
                    fornecedor_id: currentUser.id,
                    solicitante_id: urgency.usuario_id,
                    status: 'PENDENTE',
                    tipo: formData.type,
                    quantidade: Number(formData.quantity),
                    data_devolucao_prevista: formData.type === 'EMPRESTIMO' ? formData.returnDate : null
                }]);

            if (transactionError) throw transactionError;

            setSuccess(true);

        } catch (err) {
            console.error(err);
            alert("Erro ao confirmar atendimento: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (!urgencyId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-lg w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                    <X size={24} />
                </button>

                {loading ? (
                    <div className="p-12 text-center text-gray-500">Carregando detalhes...</div>
                ) : success ? (
                    <div className="p-8 text-center space-y-6 animate-fade-in-up overflow-y-auto">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Atendimento Confirmado!</h2>
                        <p className="text-gray-600">
                            Sua oferta foi enviada ao solicitante. Ele poderá aceitar ou recusar em Minhas Urgências.
                        </p>

                        <div className="bg-brand-lavender/10 p-4 rounded-lg text-left space-y-3">
                            <h3 className="font-semibold text-gray-800 border-b pb-2">Próximos Passos:</h3>
                            <div className="flex items-start gap-3">
                                <Truck className="w-5 h-5 text-brand-deep mt-1" />
                                <p className="text-sm text-gray-600">Logistica informada: <strong>{formData.logistics}</strong>.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-brand-deep mt-1" />
                                <div className="text-sm text-gray-600">
                                    <p>Contato: <strong>{urgency.contato_nome}</strong> ({urgency.contato_email})</p>
                                    <p className="mt-1 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-brand-deep" />
                                        <span>{urgency.contato_whatsapp || 'Celular/WhatsApp nao informado'}</span>
                                    </p>
                                    {urgency.contato_whatsapp && (
                                        <a
                                            href={formatWhatsAppUrl(urgency.contato_whatsapp)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-2 inline-flex items-center gap-2 text-green-700 font-semibold hover:underline"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Abrir WhatsApp
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-brand-ink text-white rounded-lg font-bold hover:bg-brand-deep transition"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50">
                            <div className="flex items-center gap-3 text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                                <h2 className="text-xl font-bold text-gray-900">Atender Urgência</h2>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Configure como você irá atender esta solicitação.</p>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
                            {/* Request Info */}
                            <div className="bg-white p-4 rounded-lg border border-brand-lavender/30 shadow-sm">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Solicitação</span>
                                <h3 className="font-bold text-gray-900 text-lg">{urgency.item_nome}</h3>
                                <div className="flex gap-3 mt-2 text-sm">
                                    <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">Qtd: {urgency.quantidade}</span>
                                    <span className="bg-red-50 text-red-700 px-2 py-1 rounded font-medium">{urgency.nivel_urgencia_label}</span>
                                </div>
                            </div>

                            {/* Form */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Modalidade</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'DOACAO' })}
                                            className={`p-2 rounded-lg border text-sm font-medium transition ${formData.type === 'DOACAO' ? 'bg-brand-lavender/20 border-brand-periwinkle text-brand-royal' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            Doação
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'EMPRESTIMO' })}
                                            className={`p-2 rounded-lg border text-sm font-medium transition ${formData.type === 'EMPRESTIMO' ? 'bg-brand-lavender/20 border-brand-periwinkle text-brand-deep' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            Empréstimo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'PERMUTA' })}
                                            className={`p-2 rounded-lg border text-sm font-medium transition ${formData.type === 'PERMUTA' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            Permuta
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Logistica</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['A COMBINAR', 'RETIRADA', 'ENTREGA'].map(option => (
                                            <button
                                                key={option}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, logistics: option })}
                                                className={`p-2 rounded-lg border text-sm font-medium transition ${formData.logistics === option ? 'bg-brand-lavender/20 border-brand-periwinkle text-brand-royal' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                            >
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Coins className="w-4 h-4" />
                                        Preço Unitário / Custo (R$)
                                    </label>
                                    <input
                                        type="text"
                                        name="unitPrice"
                                        value={formData.unitPrice}
                                        onChange={handlePriceChange}
                                        placeholder="R$ 0,00"
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-periwinkle focus:border-brand-periwinkle transition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Informe apenas o custo de referência. <strong>Não há taxa de sucesso: o atendimento está incluído na assinatura.</strong>
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                        <Package className="w-4 h-4" />
                                        Quantidade Disponível (Total Solicitado: {urgency.quantidade})
                                    </label>
                                    <input
                                        type="number"
                                        name="quantity"
                                        value={formData.quantity}
                                        onChange={handleChange}
                                        min="1"
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-periwinkle focus:border-brand-periwinkle transition"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <Package className="w-4 h-4" />
                                            Lote
                                        </label>
                                        <input
                                            type="text"
                                            name="lote"
                                            value={formData.lote}
                                            onChange={handleChange}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-periwinkle focus:border-brand-periwinkle transition"
                                            placeholder="Nº Lote"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Validade
                                        </label>
                                        <input
                                            type="date"
                                            name="validade"
                                            value={formData.validade}
                                            onChange={handleChange}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-periwinkle focus:border-brand-periwinkle transition"
                                        />
                                    </div>
                                </div>

                                {formData.type === 'EMPRESTIMO' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            Prazo de Devolução
                                        </label>
                                        <input
                                            type="date"
                                            name="returnDate"
                                            value={formData.returnDate}
                                            onChange={handleChange}
                                            required
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-periwinkle transition"
                                        />
                                    </div>
                                )}

                                {formData.type === 'PERMUTA' && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                            <RefreshCw className="w-4 h-4" />
                                            Itens para Troca
                                        </label>
                                        <textarea
                                            name="exchangeItems"
                                            value={formData.exchangeItems}
                                            onChange={handleChange}
                                            placeholder="Descreva o que você precisa..."
                                            rows={2}
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 transition"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-white flex-shrink-0">
                            <button
                                onClick={handleConfirmMatch}
                                disabled={processing}
                                className="w-full bg-brand-deep hover:bg-brand-royal text-white py-4 rounded-lg font-bold shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                            >
                                {processing ? 'Processando...' : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Confirmar Atendimento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UrgencyResponseModal;
