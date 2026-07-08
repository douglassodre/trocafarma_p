import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { apiService } from '../services/apiService'

import logo from '../assets/logo.png'

const onlyDigits = (value) => value.replace(/\D/g, '')

const SignUp = () => {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        cpf: '',
        cnpj: '',
        whatsapp: '',
    })
    const [institutionName, setInstitutionName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [signupComplete, setSignupComplete] = useState(false)
    const [loadingCpf, setLoadingCpf] = useState(false)
    const [loadingCnpj, setLoadingCnpj] = useState(false)

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    const handlePhoneChange = (e) => {
        let value = e.target.value.replace(/\D/g, '')
        if (value.length > 11) value = value.slice(0, 11)

        // Mask: (XX) XXXXX-XXXX
        if (value.length > 2) {
            value = `(${value.slice(0, 2)}) ${value.slice(2)}`
        }
        if (value.length > 9) {
            value = `${value.slice(0, 9)}-${value.slice(9)}`
        }

        setFormData({ ...formData, whatsapp: value })
    }

    const handleBlurCpf = async () => {
        if (!formData.cpf || formData.cpf.length < 11) return
        setLoadingCpf(true)
        try {
            const data = await apiService.fetchCPFData(formData.cpf)
            // Try specific fields based on API variations: nome, n, OR data.nome
            const name = data.nome || data.n || (data.data && data.data.nome) || ''
            if (name) {
                setFormData(prev => ({ ...prev, name: name }))
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingCpf(false)
        }
    }

    const handleBlurCnpj = async () => {
        const cleanCnpj = onlyDigits(formData.cnpj)
        if (cleanCnpj.length !== 14) return
        setLoadingCnpj(true)
        setError(null)
        try {
            const data = await apiService.fetchCNPJData(cleanCnpj)
            if (data) {
                // BrasilAPI returns keys directly: nome_fantasia, razao_social
                const name = data.nome_fantasia || data.razao_social || ''
                setInstitutionName(name)
            }
        } catch (err) {
            console.error(err)
            setError('Erro ao validar CNPJ. Verifique se está correto.')
        } finally {
            setLoadingCnpj(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // 1. Check/Create Institution
            let institutionId = null
            let isNewInstitution = false
            const cleanCnpj = onlyDigits(formData.cnpj)

            if (cleanCnpj.length !== 14) {
                throw new Error('Informe um CNPJ valido.')
            }

            // Check if institution exists
            const { data: existingInst, error: existingInstError } = await supabase
                .from('instituicoes')
                .select('id')
                .in('cnpj', [cleanCnpj, formData.cnpj])
                .limit(1)
                .maybeSingle()

            if (existingInstError) throw existingInstError

            if (existingInst) {
                institutionId = existingInst.id
            } else {
                const cnpjData = await apiService.fetchCNPJData(cleanCnpj)
                const name = cnpjData.nome_fantasia || cnpjData.razao_social || 'Nome Desconhecido'
                const city = cnpjData.municipio || 'Desconhecida'

                const { data: newInst, error: instError } = await supabase
                    .from('instituicoes')
                    .insert([{
                        cnpj: cleanCnpj,
                        nome_fantasia: name,
                        cidade: city,
                        status: 'PENDENTE'
                    }])
                    .select()
                    .single()

                if (instError) throw instError
                institutionId = newInst.id
                isNewInstitution = true
            }

            // 2. Determine Role
            let role = 'OPERADOR'
            if (isNewInstitution) {
                role = 'UNIDADE_ADM'
            } else {
                const { count } = await supabase
                    .from('perfis_usuarios')
                    .select('*', { count: 'exact', head: true })
                    .eq('instituicao_id', institutionId)

                if (count === 0) role = 'UNIDADE_ADM'
            }

            // 3. Sign Up User. A database trigger creates the profile from this metadata.
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email.trim().toLowerCase(),
                password: formData.password,
                options: {
                    data: {
                        nome: formData.name,
                        instituicao_id: institutionId,
                        cnpj: cleanCnpj,
                        role: role,
                        cpf: formData.cpf,
                        whatsapp: formData.whatsapp,
                        is_active: role === 'UNIDADE_ADM',
                    },
                },
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Erro ao criar usuário')

            setSignupComplete(true)

        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro no cadastro')
        } finally {
            setLoading(false)
        }
    }

    if (signupComplete) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-brand-mist px-4">
                <div className="max-w-md w-full space-y-6 p-8 bg-white shadow rounded-lg text-center border border-brand-lavender/40">
                    <div className="flex justify-center">
                        <img src={logo} alt="Trocafarma" className="h-16 w-16 object-contain" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Cadastro realizado</h2>
                        <p className="mt-3 text-sm text-gray-600">
                            Enviamos um e-mail de confirmação para <strong>{formData.email}</strong>.
                            Confirme seu cadastro pelo link recebido antes de acessar sua conta.
                        </p>
                    </div>
                    <div className="rounded-md bg-brand-lavender/20 p-4 text-sm text-brand-ink">
                        Se não encontrar a mensagem, verifique também a caixa de spam ou lixo eletrônico.
                    </div>
                    <Link
                        to="/signin"
                        className="inline-flex w-full justify-center rounded-md bg-brand-deep px-4 py-2 text-sm font-medium text-white hover:bg-brand-royal"
                    >
                        Ir para login
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-brand-mist px-4">
            <div className="max-w-md w-full space-y-8 p-8 bg-white shadow rounded-lg relative border border-brand-lavender/40">
                <button
                    onClick={() => navigate('/')}
                    className="absolute top-4 left-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                    ← Voltar
                </button>
                <div className="flex justify-center mb-4">
                    <img src={logo} alt="Trocafarma" className="h-16 w-16 object-contain" />
                </div>
                <h2 className="text-3xl font-bold text-center text-gray-900">Cadastro Trocafarma</h2>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">CPF</label>
                            <div className="relative">
                                <input
                                    name="cpf"
                                    type="text"
                                    required
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                    placeholder="000.000.000-00"
                                    value={formData.cpf}
                                    onChange={handleChange}
                                    onBlur={handleBlurCpf}
                                />
                                {loadingCpf && <span className="absolute right-3 top-2 text-xs text-gray-400">Validando...</span>}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Nome Completo</label>
                            <input
                                name="name"
                                type="text"
                                required
                                readOnly
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 bg-brand-mist cursor-not-allowed focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                value={formData.name}
                            />
                            <p className="mt-1 text-xs text-gray-500">Preenchido automaticamente verifique o CPF.</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                            <input
                                name="whatsapp"
                                type="text"
                                required
                                placeholder="(00) 00000-0000"
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                value={formData.whatsapp}
                                onChange={handlePhoneChange}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">CNPJ da Instituição</label>
                            <div className="relative">
                                <input
                                    name="cnpj"
                                    type="text"
                                    required
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                    placeholder="00.000.000/0000-00"
                                    value={formData.cnpj}
                                    onChange={handleChange}
                                    onBlur={handleBlurCnpj}
                                />
                                {loadingCnpj && <span className="absolute right-3 top-2 text-xs text-gray-400">Validando...</span>}
                            </div>
                        </div>

                        {institutionName && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700">Nome da instituição</label>
                                <input
                                    type="text"
                                    readOnly
                                    disabled
                                    className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 bg-gray-100 text-gray-600 sm:text-sm"
                                    value={institutionName}
                                />
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700">Senha</label>
                            <input
                                name="password"
                                type="password"
                                required
                                className="appearance-none rounded relative block w-full px-3 py-2 border border-brand-lavender/60 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-periwinkle focus:border-brand-deep sm:text-sm"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-deep hover:bg-brand-royal focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-periwinkle disabled:opacity-50"
                        >
                            {loading ? 'Cadastrando...' : 'Criar Conta'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SignUp
