import { redirect } from "next/navigation"
import HomePage from "@/components/home-page"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export default async function Page() {
  const supabase = getSupabaseServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect("/login")
  }

  return <HomePage />
}
