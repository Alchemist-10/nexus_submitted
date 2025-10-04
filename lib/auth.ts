import { getSupabaseBrowserClient } from '@/lib/supabase-client'
import { User } from '@/lib/types'


export class AuthService {
    private supabase = getSupabaseBrowserClient()

    async getCurrentUser(): Promise<User | null> {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser()

            if (error || !user) {
                return null
            }

            // Get user profile
            const { data: profile, error: profileError } = await this.supabase
                .from('profiles')
                .select('id, username, full_name, avatar_url, bio, reputation, created_at, updated_at')
                .eq('id', user.id)
                .single()

            if (profileError) {
                console.error('Error fetching user profile:', profileError)
                return null
            }

            return {
                id: profile.id,
                email: user.email || '',
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                bio: profile.bio,
                reputation: profile.reputation,
                created_at: profile.created_at,
                updated_at: profile.updated_at
            }
        } catch (error) {
            console.error('Error getting current user:', error)
            return null
        }
    }

    async signIn(email: string, password: string) {
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    async signUp(email: string, password: string, fullName?: string) {
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName || email.split('@')[0]
                }
            }
        })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    async signInWithOAuth(provider: 'github' | 'google' | 'discord') {
        const { data, error } = await this.supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/`
            }
        })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut()

        if (error) {
            throw new Error(error.message)
        }
    }

    async resetPassword(email: string) {
        const { data, error } = await this.supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    async updatePassword(newPassword: string) {
        const { data, error } = await this.supabase.auth.updateUser({
            password: newPassword
        })

        if (error) {
            throw new Error(error.message)
        }

        return data
    }

    onAuthStateChange(callback: (user: User | null) => void) {
        return this.supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                const user = await this.getCurrentUser()
                callback(user)
            } else if (event === 'SIGNED_OUT') {
                callback(null)
            }
        })
    }
}

export const authService = new AuthService()
