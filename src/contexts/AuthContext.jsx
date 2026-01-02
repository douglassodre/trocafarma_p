
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (userId) => {
        try {
            console.log("Fetching profile for:", userId)
            const profilePromise = supabase
                .from('perfis_usuarios')
                .select(`
          *,
          instituicoes (
            cnpj,
            nome_fantasia,
            status
          )
        `)
                .eq('id', userId)
                .single()

            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Profile Timeout')), 5000))

            // Race the profile fetch
            const { data, error } = await Promise.race([profilePromise, timeoutPromise])

            if (error) {
                console.error('Error fetching profile:', error)
                // Fallback for demo/offline: set a temporary profile so app doesn't hang
                setUserProfile({ id: userId, nome: 'Usuário (Offline/Erro)', instituicoes: { nome_fantasia: 'Modo Offline', status: 'ATIVO' } })
            } else {
                setUserProfile(data)
            }
        } catch (err) {
            console.error('Unexpected error fetching profile:', err)
            // Fallback on timeout/error
            setUserProfile({ id: userId, nome: 'Usuário (Timeout)', instituicoes: { nome_fantasia: 'Sem Conexão', status: 'ATIVO' } })
        }
    }

    useEffect(() => {
        // Check active sessions and sets the user
        const getSession = async () => {
            try {
                console.log("Starting Supabase getSession...")
                // Race condition: wait for session or timeout
                const sessionPromise = supabase.auth.getSession()
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))

                const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])

                if (error) console.error('Error getting session:', error)

                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                }
            } catch (err) {
                console.error('Unexpected error during session check:', err)
                // If timeout, just let the user in as guest roughly
            } finally {
                console.log("Auth check finished (or timed out).")
                setLoading(false)
            }
        }

        getSession()

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                await fetchProfile(session.user.id)
            } else {
                setUserProfile(null)
            }
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword(data),
        signOut: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://trocafarma.vercel.app/update-password',
        }),
        updatePassword: (password) => supabase.auth.updateUser({ password }),
        user,
        userProfile,
    }

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>Loading...</div> : children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext)
}
