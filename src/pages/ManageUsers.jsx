import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Check, X, ShieldAlert } from 'lucide-react'

const ManageUsers = () => {
    const { userProfile } = useAuth()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('perfis_usuarios')
                .select('*')
                .eq('instituicao_id', userProfile.instituicao_id)
                .order('created_at', { ascending: false })

            if (error) throw error
            setUsers(data)
        } catch (err) {
            console.error(err)
            setError('Erro ao carregar usuários da equipe.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (userProfile?.instituicao_id) {
            fetchUsers()
        }
    }, [userProfile])

    const toggleStatus = async (userId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('perfis_usuarios')
                .update({ is_active: !currentStatus })
                .eq('id', userId)

            if (error) throw error

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
        } catch (err) {
            console.error(err)
            alert('Erro ao atualizar status do usuário')
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando equipe...</div>

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900">Gerenciar Equipe</h1>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded">{error}</div>}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome / Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {users.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-slate-900">{user.nome}</div>
                                    <div className="text-sm text-slate-500">{user.email}</div>
                                    <div className="text-xs text-slate-400">CPF: {user.cpf}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'UNIDADE_ADM' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                        {user.role === 'UNIDADE_ADM' ? 'Administrador' : 'Operador'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.is_active ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Ativo
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                            Pendente / Inativo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {user.id !== userProfile.id && (
                                        <button
                                            onClick={() => toggleStatus(user.id, user.is_active)}
                                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${user.is_active
                                                    ? 'text-red-600 hover:bg-red-50'
                                                    : 'text-green-600 hover:bg-green-50'
                                                }`}
                                        >
                                            {user.is_active ? (
                                                <>
                                                    <X className="h-4 w-4" /> Bloquear
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="h-4 w-4" /> Aprovar
                                                </>
                                            )}
                                        </button>
                                    )}
                                    {user.id === userProfile.id && (
                                        <span className="text-slate-400 italic text-xs">Você</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-gray-500">Nenhum usuário encontrado na sua instituição.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ManageUsers
