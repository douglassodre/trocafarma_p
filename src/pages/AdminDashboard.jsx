import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Building2, Check, LogOut, RefreshCw, ShieldCheck, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { isSuperAdmin } from '../utils/admin'
import logo from '../assets/logo.png'

const statusStyles = {
    ATIVO: 'bg-green-100 text-green-800',
    PENDENTE: 'bg-yellow-100 text-yellow-800',
    REJEITADO: 'bg-red-100 text-red-800',
    BLOQUEADO: 'bg-slate-200 text-slate-700',
}

const AdminDashboard = () => {
    const { user, userProfile, loading: authLoading, signOut } = useAuth()
    const [institutions, setInstitutions] = useState([])
    const [profiles, setProfiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [updatingId, setUpdatingId] = useState(null)

    const canAccess = isSuperAdmin(userProfile)

    const loadData = async () => {
        try {
            setError('')
            setLoading(true)

            const [institutionsResult, profilesResult] = await Promise.all([
                supabase
                    .from('instituicoes')
                    .select('*'),
                supabase
                    .from('perfis_usuarios')
                    .select('id, nome, email, role, is_active, instituicao_id, cpf, whatsapp'),
            ])

            if (institutionsResult.error) throw institutionsResult.error
            if (profilesResult.error) throw profilesResult.error

            setInstitutions(institutionsResult.data ?? [])
            setProfiles(profilesResult.data ?? [])
        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro ao carregar dados do painel.')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!authLoading && canAccess) {
            loadData()
        }
    }, [authLoading, canAccess])

    const profilesByInstitution = useMemo(() => {
        return profiles.reduce((acc, profile) => {
            const key = profile.instituicao_id || 'sem-instituicao'
            acc[key] = acc[key] || []
            acc[key].push(profile)
            return acc
        }, {})
    }, [profiles])

    const orderedInstitutions = useMemo(() => {
        return [...institutions].sort((a, b) => {
            if (a.status === 'PENDENTE' && b.status !== 'PENDENTE') return -1
            if (a.status !== 'PENDENTE' && b.status === 'PENDENTE') return 1
            return (a.nome_fantasia || '').localeCompare(b.nome_fantasia || '')
        })
    }, [institutions])

    const stats = useMemo(() => {
        return {
            pending: institutions.filter((item) => item.status === 'PENDENTE').length,
            active: institutions.filter((item) => item.status === 'ATIVO').length,
            users: profiles.length,
            inactiveUsers: profiles.filter((item) => item.is_active === false).length,
        }
    }, [institutions, profiles])

    const updateInstitutionStatus = async (institutionId, status) => {
        try {
            setUpdatingId(institutionId)
            const { error: updateError } = await supabase
                .from('instituicoes')
                .update({ status })
                .eq('id', institutionId)

            if (updateError) throw updateError

            const shouldActivateAdmins = status === 'ATIVO'
            if (shouldActivateAdmins) {
                const { error: profileError } = await supabase
                    .from('perfis_usuarios')
                    .update({ is_active: true })
                    .eq('instituicao_id', institutionId)
                    .eq('role', 'UNIDADE_ADM')

                if (profileError) throw profileError
            }

            await loadData()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro ao atualizar instituicao.')
        } finally {
            setUpdatingId(null)
        }
    }

    const updateUserStatus = async (profileId, isActive) => {
        try {
            setUpdatingId(profileId)
            const { error: updateError } = await supabase
                .from('perfis_usuarios')
                .update({ is_active: isActive })
                .eq('id', profileId)

            if (updateError) throw updateError
            await loadData()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro ao atualizar usuario.')
        } finally {
            setUpdatingId(null)
        }
    }

    const updateUserRole = async (profileId, role) => {
        try {
            setUpdatingId(profileId)
            const { error: updateError } = await supabase
                .from('perfis_usuarios')
                .update({ role })
                .eq('id', profileId)

            if (updateError) throw updateError
            await loadData()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Erro ao atualizar permissao do usuario.')
        } finally {
            setUpdatingId(null)
        }
    }

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-600">Carregando...</div>
    }

    if (!user) {
        return <Navigate to="/signin" replace />
    }

    if (!canAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
                <div className="max-w-md w-full rounded-lg bg-white p-8 text-center shadow">
                    <ShieldCheck className="mx-auto h-10 w-10 text-red-500" />
                    <h1 className="mt-4 text-xl font-semibold text-slate-900">Acesso restrito</h1>
                    <p className="mt-2 text-sm text-slate-600">Este painel e exclusivo para administradores gerais da Trocafarma.</p>
                    <button
                        onClick={signOut}
                        className="mt-6 inline-flex w-full justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                        Sair
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-100">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                        <img src={logo} alt="Trocafarma" className="h-10 w-10 object-contain" />
                        <div>
                            <h1 className="text-lg font-semibold text-slate-900">Admin Trocafarma</h1>
                            <p className="text-xs text-slate-500">Aprovacao de instituicoes e usuarios</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadData}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                            title="Atualizar"
                        >
                            <RefreshCw className="h-4 w-4" />
                        </button>
                        <button
                            onClick={signOut}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50"
                            title="Sair"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-6">
                <section className="grid gap-4 md:grid-cols-4">
                    <Stat icon={Building2} label="Pendentes" value={stats.pending} />
                    <Stat icon={Check} label="Ativas" value={stats.active} />
                    <Stat icon={Users} label="Usuarios" value={stats.users} />
                    <Stat icon={X} label="Usuarios inativos" value={stats.inactiveUsers} />
                </section>

                {error && <div className="mt-6 rounded-md bg-red-50 p-4 text-sm text-red-700">{error}</div>}

                <section className="mt-6 overflow-hidden rounded-lg bg-white shadow">
                    <div className="border-b border-slate-200 px-6 py-4">
                        <h2 className="text-base font-semibold text-slate-900">Instituicoes</h2>
                    </div>

                    {loading ? (
                        <div className="p-6 text-sm text-slate-500">Carregando dados...</div>
                    ) : (
                        <div className="divide-y divide-slate-200">
                            {orderedInstitutions.map((institution) => (
                                <InstitutionRow
                                    key={institution.id}
                                    institution={institution}
                                    users={profilesByInstitution[institution.id] ?? []}
                                    updatingId={updatingId}
                                    onStatusChange={updateInstitutionStatus}
                                    onUserStatusChange={updateUserStatus}
                                    onUserRoleChange={updateUserRole}
                                />
                            ))}
                            {orderedInstitutions.length === 0 && (
                                <div className="p-6 text-sm text-slate-500">Nenhuma instituicao encontrada.</div>
                            )}
                        </div>
                    )}
                </section>

                {(profilesByInstitution['sem-instituicao']?.length ?? 0) > 0 && (
                    <section className="mt-6 overflow-hidden rounded-lg bg-white shadow">
                        <div className="border-b border-slate-200 px-6 py-4">
                            <h2 className="text-base font-semibold text-slate-900">Usuarios sem instituicao</h2>
                            <p className="mt-1 text-sm text-slate-500">Estes perfis precisam ser vinculados manualmente no banco ou por uma tela de edicao futura.</p>
                        </div>
                        <div className="p-6">
                            <UsersTable
                                users={profilesByInstitution['sem-instituicao']}
                                updatingId={updatingId}
                                onUserStatusChange={updateUserStatus}
                                onUserRoleChange={updateUserRole}
                            />
                        </div>
                    </section>
                )}
            </main>
        </div>
    )
}

const Stat = ({ icon: Icon, label, value }) => (
    <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">{label}</span>
            <Icon className="h-5 w-5 text-slate-400" />
        </div>
        <div className="mt-3 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
)

const InstitutionRow = ({ institution, users, updatingId, onStatusChange, onUserStatusChange, onUserRoleChange }) => {
    const statusClass = statusStyles[institution.status] || 'bg-slate-100 text-slate-700'
    const isUpdating = updatingId === institution.id

    return (
        <div className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">{institution.nome_fantasia || 'Sem nome'}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
                            {institution.status || 'SEM STATUS'}
                        </span>
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                        CNPJ: {institution.cnpj || '-'}{institution.cidade ? ` | ${institution.cidade}` : ''}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        disabled={isUpdating}
                        onClick={() => onStatusChange(institution.id, 'ATIVO')}
                        className="inline-flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        <Check className="h-4 w-4" /> Aprovar
                    </button>
                    <button
                        disabled={isUpdating}
                        onClick={() => onStatusChange(institution.id, 'REJEITADO')}
                        className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                        <X className="h-4 w-4" /> Rejeitar
                    </button>
                    <button
                        disabled={isUpdating}
                        onClick={() => onStatusChange(institution.id, 'BLOQUEADO')}
                        className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Bloquear
                    </button>
                </div>
            </div>

            <div className="mt-4 overflow-x-auto">
                <UsersTable
                    users={users}
                    updatingId={updatingId}
                    onUserStatusChange={onUserStatusChange}
                    onUserRoleChange={onUserRoleChange}
                />
            </div>
        </div>
    )
}

const UsersTable = ({ users, updatingId, onUserStatusChange, onUserRoleChange }) => (
    <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead>
            <tr className="text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-4 font-medium">Usuario</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 text-right font-medium">Acao</th>
            </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
                <tr key={user.id}>
                    <td className="py-3 pr-4">
                        <div className="font-medium text-slate-900">{user.nome || 'Sem nome'}</div>
                        <div className="text-slate-500">{user.email}</div>
                    </td>
                    <td className="py-3 pr-4">
                        <select
                            value={user.role || 'OPERADOR'}
                            disabled={updatingId === user.id}
                            onChange={(event) => onUserRoleChange(user.id, event.target.value)}
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-700 focus:border-brand-periwinkle focus:outline-none focus:ring-1 focus:ring-brand-periwinkle disabled:opacity-50"
                        >
                            <option value="OPERADOR">OPERADOR</option>
                            <option value="UNIDADE_ADM">UNIDADE_ADM</option>
                            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        </select>
                    </td>
                    <td className="py-3 pr-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                        <button
                            disabled={updatingId === user.id}
                            onClick={() => onUserStatusChange(user.id, !user.is_active)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                            {user.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                    </td>
                </tr>
            ))}
            {users.length === 0 && (
                <tr>
                    <td colSpan="4" className="py-3 text-slate-500">Nenhum usuario vinculado.</td>
                </tr>
            )}
        </tbody>
    </table>
)

export default AdminDashboard
