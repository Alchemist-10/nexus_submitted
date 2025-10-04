"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Github, Mail } from "lucide-react"

export default function LoginPage() {
    const supabase = getSupabaseBrowserClient()
    const router = useRouter()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleEmailSignIn(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) {
            setError(error.message)
        } else {
            router.push("/")
        }
    }

    async function signInWithGithub() {
        setError(null)
        setLoading(true)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo: `${window.location.origin}/` },
        })
        setLoading(false)
        if (error) setError(error.message)
    }

    return (
        // MODIFICATION: Changed bg-background to bg-transparent
        <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
            {/* MODIFICATION: Applied nexus-card styling for the glass effect */}
            <div className="w-full max-w-md space-y-6 p-8 rounded-xl bg-card/80 backdrop-blur-md border border-border/50 shadow-lg nexus-slide-in">
                <div className="text-center space-y-2">
                    {/* MODIFICATION: Added gradient to title */}
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Welcome back
                    </h1>
                    <p className="text-sm text-muted-foreground">Sign in to your Nexus account</p>
                </div>

                {error && (
                    <div className="text-sm text-red-500 border border-red-500/30 rounded-md p-3 bg-red-500/10 text-center">{error}</div>
                )}

                <form onSubmit={handleEmailSignIn} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="email">Email</label>
                        <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="password">Password</label>
                        <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <Button type="submit" className="w-full nexus-glow" disabled={loading}>
                        <Mail className="mr-2 h-4 w-4" /> {loading ? "Signing in..." : "Sign in"}
                    </Button>
                </form>

                <div className="relative">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card/80 px-2 text-xs text-muted-foreground">or</span>
                </div>

                <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={signInWithGithub} disabled={loading}>
                        <Github className="mr-2 h-4 w-4" /> Continue with GitHub
                    </Button>
                </div>

                <p className="text-center text-sm text-muted-foreground">
                    Don&apos;t have an account? <Link href="/register" className="text-primary hover:underline">Sign up</Link>
                </p>
            </div>
        </div>
    )
}