"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isConfigured, appUrl } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  signInSchema,
  signUpSchema,
  safeNext,
  type ActionState,
} from "@/lib/validation";

export async function signIn(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!isConfigured())
    return {
      error: "Connect a new Supabase project first. See the setup page.",
    };
  const parsed = signInSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: "Enter a valid email address and password." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error)
    return {
      error:
        "Sign-in failed. Check your details and confirm your email before signing in.",
    };
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function signUp(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!isConfigured())
    return {
      error: "Connect a new Supabase project first. See the setup page.",
    };
  const parsed = signUpSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message || "Check your details." };
  const supabase = await createSupabaseServerClient();
  const { email, password, fullName } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl()}/auth/callback`,
    },
  });
  if (error)
    return {
      error:
        "We could not create an account. Check your details and try again shortly.",
    };
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/dashboard");
  }
  return {
    success:
      "Check your inbox for a confirmation link. If you already have an account, sign in instead.",
  };
}

export async function signOut() {
  if (isConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();
    if (error) redirect("/dashboard?notice=signout-error");
  }
  revalidatePath("/", "layout");
  redirect("/");
}
