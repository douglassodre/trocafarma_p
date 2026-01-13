import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

import logo from '../assets/logo.png'

const SignIn = () => {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const { signIn } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await signIn({ email, password })
            if (error) throw error

            if (data.user) {
                // Fetch profile to decide direction
                const { data: profile } = await supabase
                    .from('perfis_usuarios')
                    .select('*, instituicoes (status)')
                    .eq('id', data.user.id)
                    .single()

                const urgencyId = searchParams.get('urgency_id')
                const action = searchParams.get('action')

                if (profile?.instituicoes?.status === 'PENDENTE') {
                    navigate('/pending-approval')
                } else {
                    if (urgencyId) {
                        navigate(`/dashboard?help_urgency=${urgencyId}`)
                    } else {
                        navigate('/dashboard')
                    }
                }
            }
        } catch (err) {
            console.error(err)
            setError('Falha ao fazer login. Verifique suas credenciais.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full space-y-8 p-8 bg-white shadow rounded-xl">
                <div>
                    <div className="flex justify-center mb-4">
                        <img src={logo} alt="Trocafarma" className="h-16 w-16 object-contain" />
                    </div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Entrar na Trocafarma
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Ou{' '}
                        <Link to={`/signup?${searchParams.toString()}`} className="font-medium text-indigo-600 hover:text-indigo-500">
                            crie uma nova conta
                        </Link>
                    </p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label className="sr-only">Email</label>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="sr-only">Senha</label>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div className="text-right">
                            <Link to="/forgot-password" className="font-medium text-sm text-indigo-600 hover:text-indigo-500">
                                Esqueceu sua senha?
                            </Link>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default SignIn
