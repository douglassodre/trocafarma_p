import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

import logo from '../assets/logo.png'

const ForgotPassword = () => {
    const { resetPassword } = useAuth()
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            setMessage('')
            setError('')
            setLoading(true)
            const { error } = await resetPassword(email.trim().toLowerCase())
            if (error) throw error
            setMessage('Verifique sua caixa de entrada para seguir com a redefinição de senha.')
        } catch (err) {
            console.error(err)
            setError('Falha ao redefinir senha. Verifique se o email está correto.')
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
                        Redefinir Senha
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Informe seu email para receber o link de redefinição.
                    </p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}
                {message && <div className="bg-green-50 text-green-600 p-3 rounded text-sm">{message}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label className="sr-only">Email</label>
                            <input
                                type="email"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Enviando...' : 'Enviar Email'}
                        </button>
                    </div>

                    <div className="text-center">
                        <Link to="/signin" className="font-medium text-indigo-600 hover:text-indigo-500">
                            Voltar para o Login
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword
