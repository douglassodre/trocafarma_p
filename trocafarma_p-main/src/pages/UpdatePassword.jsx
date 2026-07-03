import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

import logo from '../assets/logo.png'

const UpdatePassword = () => {
    const { updatePassword } = useAuth()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (password !== confirmPassword) {
            return setError('As senhas não coincidem')
        }

        try {
            setError('')
            setLoading(true)
            const { error } = await updatePassword(password)
            if (error) throw error
            navigate('/')
        } catch (err) {
            console.error(err)
            setError('Falha ao atualizar a senha.')
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
                        Atualizar Senha
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Defina sua nova senha.
                    </p>
                </div>

                {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="rounded-md shadow-sm space-y-4">
                        <div>
                            <label className="sr-only">Nova Senha</label>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Nova Senha"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="sr-only">Confirmar Nova Senha</label>
                            <input
                                type="password"
                                required
                                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Confirmar Nova Senha"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {loading ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default UpdatePassword
