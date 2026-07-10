import React, { useState } from 'react';
import { X, Search, Clock, ArrowRight, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/apiService';
import Autocomplete from './Autocomplete';
import { useNavigate } from 'react-router-dom';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const formatCpf = (value) => {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1-$2');
};

const UrgencyWizard = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingCpf, setLoadingCpf] = useState(false);
    const [loadingCnpj, setLoadingCnpj] = useState(false);

    // Smart Identify Status
    const [identificationStatus, setIdentificationStatus] = useState('listening'); // listening, checking, known, new

    // Form Data
    const [formData, setFormData] = useState({
        item_nome: '',
        item_codigo: '',
        quantidade: '',
        urgencia_label: '',
        data_expiracao: null,

        // Step 4 Data
        cpf: '',
        contato_nome: '', // ReadOnly via CPF or known user
        cnpj: '',
        contato_instituicao: '', // ReadOnly via CNPJ or known user
        whatsapp: '',
        contato_email: '',
        password: ''
    });

    const handleCpfChange = (event) => {
        const maskedCpf = formatCpf(event.target.value);
        setIdentificationStatus('listening');
        setFormData(prev => ({
            ...prev,
            cpf: maskedCpf,
            contato_nome: '',
            contato_email: '',
            contato_instituicao: '',
            cnpj: '',
            whatsapp: '',
            password: ''
        }));
    };

    // Check CPF with Smart Identify logic
    const checkCpfSmart = async () => {
        const normalizedCpf = onlyDigits(formData.cpf);
        if (normalizedCpf.length !== 11) {
            setIdentificationStatus('listening');
            return;
        }

        setIdentificationStatus('checking');

        try {
            const { data, error } = await supabase.rpc('check_user_by_cpf', {
                input_cpf: normalizedCpf
            });

            if (error) throw error;

            const result = data?.[0];

            if (result?.found) {
                setFormData(prev => ({
                    ...prev,
                    contato_email: result.user_email || '',
                    contato_nome: result.user_name || '',
                    contato_instituicao: result.institution_name || '',
                    cnpj: '',
                    whatsapp: ''
                }));
                setIdentificationStatus('known');
                return;
            }

            const cpfData = await apiService.fetchCPFData(normalizedCpf);
            const name = cpfData?.nome || cpfData?.n || cpfData?.data?.nome || '';
            setFormData(prev => ({
                ...prev,
                contato_nome: name,
                contato_email: '',
                contato_instituicao: ''
            }));
            setIdentificationStatus('new');
        } catch (err) {
            console.error("Smart Identify Error:", err);
            setIdentificationStatus('error');
        }
    };

    const handleBlurCnpj = async () => {
        if (!formData.cnpj || formData.cnpj.length < 14) return;
        setLoadingCnpj(true);
        try {
            const data = await apiService.fetchCNPJData(formData.cnpj);
            if (data) {
                const name = data.nome_fantasia || data.razao_social || '';
                setFormData(prev => ({ ...prev, contato_instituicao: name }));
            }
        } catch (err) {
            console.error("CNPJ Error:", err);
        } finally {
            setLoadingCnpj(false);
        }
    };

    // Phone Mask
    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
        if (value.length > 9) value = `${value.slice(0, 9)}-${value.slice(9)}`;
        setFormData(prev => ({ ...prev, whatsapp: value }));
    };

    // Search Function for Autocomplete
    const searchItems = async (query) => {
        const { data, error } = await supabase
            .from('catalogo_itens')
            .select('codigo, descricao_oficial')
            .ilike('descricao_oficial', `%${query}%`)
            .limit(10);

        if (error) {
            console.error(error);
            return [];
        }
        return data.map(item => ({ label: item.descricao_oficial, value: item.codigo, subLabel: item.codigo }));
    };

    const handleNext = () => {
        if (step === 1 && !formData.item_nome) return alert("Selecione um item.");
        if (step === 2 && (!formData.quantidade || !formData.urgencia_label)) return alert("Preencha todos os campos.");

        // Step 4 Validation
        if (step === 4) {
            if (identificationStatus === 'listening') return alert("Informe um CPF válido.");
            if (identificationStatus === 'checking') return alert("Aguarde a consulta do CPF.");
            if (identificationStatus === 'error') return alert("Não foi possível consultar o CPF. Tente novamente.");
            if (!formData.password) return alert("Informe a senha.");
            if (identificationStatus === 'new') {
                if (!formData.cnpj || !formData.whatsapp || !formData.contato_email) return alert("Preencha todos os campos.");
            }
        }

        if (step < 4) {
            setStep(step + 1);
        } else {
            handleFinalSubmit();
        }
    };

    const handleFinalSubmit = async () => {
        setLoading(true);
        try {
            let authUser = null;

            if (identificationStatus === 'known') {
                // Login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: formData.contato_email,
                    password: formData.password,
                });
                if (error) throw new Error("Senha incorreta ou erro no login.");
                authUser = data.user;
            } else {
                // Sign Up (New User)
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.contato_email,
                    password: formData.password,
                });

                if (authError) {
                    if (authError.message.includes('already registered')) {
                        // Fallback logic for accidental new user status but email exists
                        const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                            email: formData.contato_email,
                            password: formData.password,
                        });
                        if (loginError) throw new Error("Email já cadastrado. Falha no login.");
                        authUser = loginData.user;
                    } else {
                        throw authError; // Real error
                    }
                } else {
                    authUser = authData.user || authData.session?.user;
                }
            }

            if (!authUser) throw new Error("Falha de autenticação.");

            await finalizeUrgencyCreation(authUser);

        } catch (error) {
            console.error(error);
            alert("Erro: " + (error.message || "Tente novamente."));
            setLoading(false);
        }
    };

    const finalizeUrgencyCreation = async (user) => {
        try {
            const city = 'Salvador';
            let institutionId = null;

            // Only create institution/profile if NEW
            if (identificationStatus === 'new') {
                const { data: existingInst } = await supabase
                    .from('instituicoes')
                    .select('id')
                    .eq('cnpj', formData.cnpj)
                    .single();

                if (existingInst) {
                    institutionId = existingInst.id;
                } else {
                    const { data: newInst, error: instError } = await supabase
                        .from('instituicoes')
                        .insert([{
                            cnpj: formData.cnpj,
                            nome_fantasia: formData.contato_instituicao,
                            cidade: city,
                            status: 'PENDENTE'
                        }])
                        .select()
                        .single();
                    if (instError) throw instError;
                    institutionId = newInst.id;
                }

                await supabase.from('perfis_usuarios').upsert([{
                    id: user.id,
                    nome: formData.contato_nome,
                    email: formData.contato_email,
                    cpf: formData.cpf,
                    whatsapp: formData.whatsapp,
                    instituicao_id: institutionId,
                    role: 'UNIDADE_ADM',
                    is_active: true
                }], { onConflict: 'id' });
            }

            // Create Urgency Request
            let expirationDate = new Date();
            if (formData.urgencia_label === 'Hoje') expirationDate.setHours(expirationDate.getHours() + 12);
            else if (formData.urgencia_label === '24h') expirationDate.setDate(expirationDate.getDate() + 1);
            else if (formData.urgencia_label === '48h') expirationDate.setDate(expirationDate.getDate() + 2);

            const { error: urgencyError } = await supabase
                .from('solicitacoes_urgentes')
                .insert([{
                    item_codigo: formData.item_codigo,
                    item_nome: formData.item_nome,
                    quantidade: parseInt(formData.quantidade),
                    nivel_urgencia_label: formData.urgencia_label,
                    data_expiracao: expirationDate.toISOString(),
                    cidade: city,
                    contato_nome: formData.contato_nome,
                    contato_email: formData.contato_email,
                    contato_instituicao: formData.contato_instituicao,
                    usuario_id: user.id,
                    status: 'ATIVA'
                }]);

            if (urgencyError) throw urgencyError;

            alert("Solicitação de Urgência Criada com Sucesso!");
            onClose();
            navigate('/dashboard');

        } catch (err) {
            console.error(err);
            alert("Erro final: " + err.message);
            setLoading(false);
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">

            <div className={`bg-white rounded-lg w-full max-w-lg shadow-2xl overflow-hidden relative animate-fade-in-up transition-all duration-500 ease-in-out ${step === 4 ? 'max-w-xl' : 'max-w-lg'}`}>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                    <X size={24} />
                </button>

                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 w-full">
                    <div
                        className="h-full bg-brand-deep transition-all duration-300"
                        style={{ width: `${(step / 4) * 100}%` }}
                    ></div>
                </div>

                <div className="p-8">
                    {/* Step 1: Identification */}
                    {step === 1 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900">Qual item você precisa?</h2>
                            <p className="text-gray-500">Busque na base unificada de medicamentos.</p>

                            <Autocomplete
                                placeholder="Ex: Meropenem, Soro Fisiológico..."
                                onSearch={searchItems}
                                onSelect={(item) => setFormData({ ...formData, item_nome: item.label, item_codigo: item.value })}
                                initialValue={formData.item_nome}
                            />
                        </div>
                    )}

                    {/* Step 2: Qualification */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-gray-900">Detalhes da Urgência</h2>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade Necessária</label>
                                <input
                                    type="number"
                                    className="w-full p-3 border border-brand-lavender/60 rounded-lg focus:ring-2 focus:ring-brand-periwinkle outline-none"
                                    value={formData.quantidade}
                                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                                    placeholder="0"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Até quando você precisa?</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Hoje', '24h', '48h'].map((opt) => (
                                        <button
                                            key={opt}
                                            onClick={() => setFormData({ ...formData, urgencia_label: opt })}
                                            className={`py-3 px-4 rounded-lg border font-medium transition-all ${formData.urgencia_label === opt
                                                    ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-200'
                                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Transparency */}
                    {step === 3 && (
                        <div className="space-y-6 text-center">
                            <div className="w-16 h-16 bg-brand-periwinkle/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="text-brand-deep w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Resumo da Operação</h2>

                            <div className="bg-brand-lavender/10 p-6 rounded-lg space-y-4 text-left">
                                <div className="flex items-center text-gray-700">
                                    <CheckCircle className="w-5 h-5 text-brand-deep mr-3" />
                                    <span>Sua solicitação será enviada para <strong>42 instituições</strong> em Salvador.</span>
                                </div>
                                <div className="flex items-center text-gray-700">
                                    <CheckCircle className="w-5 h-5 text-brand-deep mr-3" />
                                    <span>Taxa de Gestão de Mútuo: <strong>1%</strong> (apenas se houver sucesso).</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Smart Identify Flow */}
                    {step === 4 && (
                        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2 transition-all">
                            <h2 className="text-2xl font-bold text-gray-900">Finalizar</h2>
                            <p className="text-gray-500 text-sm">Identificação do solicitante.</p>

                            {/* CPF First - Smart Input */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="CPF"
                                    className={`w-full p-4 border rounded-lg outline-none text-lg transition-all ${identificationStatus === 'known' ? 'border-brand-deep bg-brand-lavender/20 ring-1 ring-brand-periwinkle' : 'border-gray-300 focus:border-brand-deep'
                                        }`}
                                    value={formData.cpf}
                                    onChange={handleCpfChange}
                                    onBlur={checkCpfSmart}
                                    inputMode="numeric"
                                    autoComplete="username"
                                    maxLength={14}
                                />
                                {identificationStatus === 'checking' && (
                                    <div className="absolute right-4 top-4">
                                        <Loader2 className="w-6 h-6 animate-spin text-brand-deep" />
                                    </div>
                                )}
                                {identificationStatus === 'known' && (
                                    <div className="absolute right-4 top-4">
                                        <CheckCircle className="w-6 h-6 text-brand-deep" />
                                    </div>
                                )}
                            </div>

                            {identificationStatus === 'error' && (
                                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    Não foi possível consultar o CPF. Verifique sua conexão e tente novamente.
                                </div>
                            )}

                            {/* Known User Flow */}
                            {identificationStatus === 'known' && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="rounded-lg border border-brand-periwinkle/30 bg-brand-lavender/10 p-4">
                                        <p className="mb-3 font-semibold text-brand-ink">Cadastro encontrado</p>
                                        <dl className="space-y-3 text-sm">
                                            <div>
                                                <dt className="text-gray-500">Nome</dt>
                                                <dd className="font-medium text-gray-900">{formData.contato_nome}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">E-mail</dt>
                                                <dd className="font-medium text-gray-900">{formData.contato_email}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-gray-500">Instituição vinculada</dt>
                                                <dd className="font-medium text-gray-900">{formData.contato_instituicao}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <input
                                        type="password" placeholder="Sua Senha"
                                        className="w-full p-4 border border-brand-lavender/60 rounded-lg outline-none focus:border-brand-deep transition-all"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        autoFocus
                                    />
                                    <p className="text-xs text-gray-400">Digite sua senha para confirmar sua identidade.</p>
                                </div>
                            )}

                            {/* New User Flow */}
                            {identificationStatus === 'new' && (
                                <div className="space-y-4 animate-fade-in-up">
                                    {/* CNPJ & Institution */}
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="relative">
                                            <input
                                                type="text" placeholder="CNPJ da Instituição"
                                                className="w-full p-4 border border-brand-lavender/60 rounded-lg outline-none focus:border-brand-deep"
                                                value={formData.cnpj}
                                                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                                                onBlur={handleBlurCnpj}
                                            />
                                            {loadingCnpj && <Loader2 className="absolute right-4 top-4 w-5 h-5 animate-spin text-gray-400" />}
                                        </div>
                                        <input
                                            type="text" placeholder="Nome da Instituição"
                                            className="w-full p-4 border border-brand-lavender/30 bg-gray-50 rounded-lg outline-none text-gray-500"
                                            value={formData.contato_instituicao}
                                            readOnly
                                        />
                                    </div>

                                    {/* Contact Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <input
                                            type="text" placeholder="WhatsApp"
                                            className="w-full p-4 border border-brand-lavender/60 rounded-lg outline-none focus:border-brand-deep"
                                            value={formData.whatsapp}
                                            onChange={handlePhoneChange}
                                        />
                                        <input
                                            type="email" placeholder="E-mail"
                                            className="w-full p-4 border border-brand-lavender/60 rounded-lg outline-none focus:border-brand-deep"
                                            value={formData.contato_email}
                                            onChange={(e) => setFormData({ ...formData, contato_email: e.target.value })}
                                        />
                                    </div>

                                    {/* Password */}
                                    <input
                                        type="password" placeholder="Criar Senha"
                                        className="w-full p-4 border border-brand-lavender/60 rounded-lg outline-none focus:border-brand-deep"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    />
                                    <p className="text-xs text-gray-400">Preencha os dados restantes para criar sua conta.</p>
                                </div>
                            )}

                        </div>
                    )}

                    {/* Footer Buttons */}
                    <div className="mt-8 flex justify-between items-center">
                        {step > 1 ? (
                            <button
                                onClick={() => setStep(step - 1)}
                                className="text-gray-500 hover:text-gray-800 font-medium"
                            >
                                Voltar
                            </button>
                        ) : <div></div>}

                        <button
                            onClick={handleNext}
                            disabled={loading || identificationStatus === 'checking' || identificationStatus === 'error'}
                            className={`px-8 py-3 rounded-lg font-bold shadow-lg transform active:scale-95 transition-all flex items-center 
                                ${step === 4 && identificationStatus !== 'listening' ? 'bg-brand-deep hover:bg-brand-royal text-white' : 'bg-brand-ink hover:bg-brand-deep text-white'}
                            `}
                        >
                            {loading ? 'Processando...' : step === 4 ? (identificationStatus === 'known' ? 'Entrar e Publicar' : 'Cadastrar e Publicar') : 'Continuar'}
                            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UrgencyWizard;
