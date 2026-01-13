import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Truck, Building2, User, Coins, Calendar, RefreshCw, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';

const UrgencyResponseModal = ({ urgencyId, onClose, currentUser }) => {
    const [urgency, setUrgency] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [success, setSuccess] = useState(false);
    const [transaction, setTransaction] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        type: 'DOACAO', // DOACAO, EMPRESTIMO, PERMUTA
        unitPrice: '',
        lote: '',
        lote: '',
        validade: '',
        returnDate: '',
        exchangeItems: '',
        quantity: ''
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
            setUrgency(data);
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
        return parseFloat(value.replace(/[^\d,]/g, '').replace(',', '.')) / 100; // This handles the raw input better if manual parsing is needed, but usually we parse the valid numeric string.
        // Actually for the "R$ 1.234,56" string:
        // 1. Remove non-numeric chars except comma
        const cleanString = value.replace(/\D/g, '');
        return parseFloat(cleanString) / 100;
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
                logistica: 'A COMBINAR'
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

            // 2. Create Transaction via Backend (Stripe Billing)
            const unitPriceInCents = parseInt(formData.unitPrice.replace(/\D/g, ''), 10) || 0;

            const { data: { transaction: trans }, error: transError } = await supabase.functions.invoke('create-transaction', {
                body: {
                    anuncio_id: newAd.id,
                    fornecedor_id: currentUser.id, // Current user is answering
                    status: 'PENDENTE', // 'PENDENTE' until accepted? Or 'SOLICITADO'? Original was 'PENDENTE'
                    tipo: formData.type,
                    quantidade: formData.quantity,
                    data_devolucao_prevista: formData.type === 'EMPRESTIMO' ? formData.returnDate : null,
                    unit_price: unitPriceInCents
                }
            });

            if (transError) throw new Error(transError.message || 'Error executing create-transaction');

            // 3. Update Urgency Status
            const { error: updateError } = await supabase
                .from('solicitacoes_urgentes')
                .update({ status: 'EM_ATENDIMENTO' })
                .eq('id', urgencyId);

            if (updateError) throw updateError;

            setTransaction(trans);
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
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden">
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
                            A transação foi criada com sucesso! O solicitante será notificado.
                        </p>

                        <div className="bg-gray-50 p-4 rounded-xl text-left space-y-3">
                            <h3 className="font-semibold text-gray-800 border-b pb-2">Próximos Passos:</h3>
                            <div className="flex items-start gap-3">
                                <Truck className="w-5 h-5 text-indigo-600 mt-1" />
                                <p className="text-sm text-gray-600">Combine a logística de entrega do item.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <User className="w-5 h-5 text-indigo-600 mt-1" />
                                <p className="text-sm text-gray-600">Contato: <strong>{urgency.contato_nome}</strong> ({urgency.contato_email})</p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition"
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
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
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
                                            className={`p-2 rounded-lg border text-sm font-medium transition ${formData.type === 'DOACAO' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            Doação
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'EMPRESTIMO' })}
                                            className={`p-2 rounded-lg border text-sm font-medium transition ${formData.type === 'EMPRESTIMO' ? 'bg-purple-50 border-purple-500 text-purple-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
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
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Necessário para cálculo de taxas e economia. <strong>Este valor não representa uma venda.</strong>
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
                                        className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
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
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
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
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
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
                                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 transition"
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
                                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold shadow-lg hover:shadow-xl transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
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
