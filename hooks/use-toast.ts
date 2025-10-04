"use client"

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info"

export interface ToastOptions {
    title?: string
    description?: string
    variant?: ToastVariant
}

export function useToast() {
    const toast = ({ title, description, variant = "default" }: ToastOptions = {}) => {
        if (typeof window === "undefined") return

        const message = [title, description].filter(Boolean).join("\n")

        if (!message) return

        // Minimal implementation: log to console; swap with a real toaster later
        const log = variant === "destructive" ? console.error : console.log
        log(message)
    }

    return { toast }
}


