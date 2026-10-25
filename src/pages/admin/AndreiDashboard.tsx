import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";
import PromptOptimizationWidget from "@/components/admin/PromptOptimizationWidget";

export default function AndreiDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  useEffect(() => { supabase.auth.getUser().then(({ data }) => { setUser(data.user); setAuthReady(true); }); }, []);
  const { isAdmin, isLoading: roleLoading } = useAdminRole(user);
  const isLoading = !authReady || (user != null && roleLoading);
  return (
    <main className="container mx-auto max-w-5xl space-y-6 px-4 py-24">
      <Helmet><title>Andrei · Admin RealTrust</title><meta name="robots" content="noindex" /></Helmet>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Andrei — asistent vocal</h1>
        <Link to="/admin" className="text-sm underline">Înapoi la Admin</Link>
      </div>
      {isLoading ? <p className="text-muted-foreground">Se verifică accesul…</p>
        : !isAdmin ? <p className="text-muted-foreground">Acces doar pentru administratori.</p>
        : <PromptOptimizationWidget />}
    </main>
  );
}
