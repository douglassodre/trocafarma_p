import { useAuth } from '../contexts/AuthContext'

import logo from '../assets/logo.png'

const PendingApproval = () => {
    const { signOut, userProfile } = useAuth()
    const institutionStatus = userProfile?.instituicoes?.status
    const hasInstitution = Boolean(userProfile?.instituicao_id)
    const isUserInactive = userProfile?.is_active === false

    let title = 'Aguardando aprovacao'
    let message = 'Sua instituicao ainda esta com status PENDENTE. Nossa equipe esta analisando seu cadastro. Por favor, aguarde a aprovacao para acessar todas as funcionalidades.'

    if (!hasInstitution) {
        title = 'Cadastro sem instituicao'
        message = 'Seu usuario foi criado, mas ainda nao esta vinculado a uma instituicao. Entre em contato com o suporte para concluir o cadastro.'
    } else if (institutionStatus !== 'PENDENTE' && isUserInactive) {
        title = 'Usuario aguardando liberacao'
        message = 'Sua instituicao ja esta ativa, mas seu usuario ainda esta inativo. Peca para um administrador da instituicao liberar seu acesso.'
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full text-center p-8 bg-white shadow rounded-xl space-y-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-50">
                    <img src={logo} alt="Trocafarma" className="h-12 w-12 object-contain" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
                <p className="text-gray-500">{message}</p>
                <button
                    onClick={signOut}
                    className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none"
                >
                    Sair e tentar novamente mais tarde
                </button>
            </div>
        </div>
    )
}

export default PendingApproval
