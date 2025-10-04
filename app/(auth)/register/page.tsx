"use client"

import { useState } from "react"
import Link from "next/link"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Mail } from "lucide-react"

export default function RegisterPage() {
    const supabase = getSupabaseBrowserClient()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    async function handleEmailSignUp(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setMessage(null)
        setLoading(true)
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: "/" } })
        setLoading(false)
        if (error) setError(error.message)
        else setMessage("Check your email to confirm your account.")
    }

    return (
        // MODIFICATION: Changed bg-background to bg-transparent
        <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
            {/* MODIFICATION: Applied nexus-card styling for the glass effect and consistent padding */}
            <div className="w-full max-w-md space-y-6 p-8 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 shadow-lg nexus-slide-in">
                <div className="text-center space-y-2">
                    {/* MODIFICATION: Added gradient to title */}
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Create an account
                    </h1>
                    <p className="text-sm text-muted-foreground">Join Nexus to share and compete</p>
                </div>

                {error && (
                    <div className="text-sm text-red-500 border border-red-500/30 rounded-md p-3 bg-red-500/10 text-center">{error}</div>
                )}
                {message && (
                    <div className="text-sm text-emerald-500 border border-emerald-500/30 rounded-md p-3 bg-emerald-500/10 text-center">{message}</div>
                )}

                <form onSubmit={handleEmailSignUp} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">Email</label>
                        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">Password</label>
                        <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full nexus-glow" disabled={loading}>
                        <Mail className="mr-2 h-4 w-4" /> {loading ? "Creating account..." : "Create account"}
                    </Button>
                </form>

                <p className="text-center text-sm text-muted-foreground">
                    Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
            </div>
        </div>
    )
}