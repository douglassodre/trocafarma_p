import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [userProfile, setUserProfile] = useState(null)
    const [profileError, setProfileError] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async (userId) => {
        try {
            setProfileError(null)
            console.log("Fetching profile for:", userId)

            const { data, error } = await supabase
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

            if (error) {
                console.error('Error fetching profile:', error)
                setUserProfile(null)
                setProfileError(error)
                return null
            }

            setUserProfile(data)
            return data
        } catch (err) {
            console.error('Unexpected error fetching profile:', err)
            setUserProfile(null)
            setProfileError(err)
            return null
        }
    }

    useEffect(() => {
        const getSession = async () => {
            try {
                console.log("Starting Supabase getSession...")
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) console.error('Error getting session:', error)

                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                } else {
                    setUserProfile(null)
                    setProfileError(null)
                }
            } catch (err) {
                console.error('Unexpected error during session check:', err)
                setUser(null)
                setUserProfile(null)
                setProfileError(err)
            } finally {
                console.log("Auth check finished.")
                setLoading(false)
            }
        }

        getSession()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Supabase can deadlock when another async client call is awaited
            // directly inside onAuthStateChange. Defer profile loading until
            // the auth callback has released its internal lock.
            setTimeout(() => {
                const syncSession = async () => {
                    try {
                        setUser(session?.user ?? null)

                        if (session?.user) {
                            await fetchProfile(session.user.id)
                        } else {
                            setUserProfile(null)
                            setProfileError(null)
                        }
                    } catch (err) {
                        console.error('Unexpected error syncing auth state:', err)
                        setProfileError(err)
                    } finally {
                        setLoading(false)
                    }
                }

                void syncSession()
            }, 0)
        })

        return () => subscription.unsubscribe()
    }, [])

    const value = {
        signUp: (data) => supabase.auth.signUp(data),
        signIn: (data) => supabase.auth.signInWithPassword({
            ...data,
            email: data.email.trim().toLowerCase(),
        }),
        signOut: () => supabase.auth.signOut(),
        resetPassword: (email) => supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://trocafarma.com/update-password',
        }),
        updatePassword: (password) => supabase.auth.updateUser({ password }),
        refreshProfile: fetchProfile,
        user,
        userProfile,
        profileError,
        loading,
    }

    return (
        <AuthContext.Provider value={value}>
            {loading ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#666' }}>Loading...</div> : children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    return useContext(AuthContext)
}
