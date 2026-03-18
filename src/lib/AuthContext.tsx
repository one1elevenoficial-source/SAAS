async function loadProfile(userId: string, userEmail: string) {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, full_name, workspace_id, role")
      .eq("id", userId)
      .single();

    if (error || !data) return null;

    const p: UserProfile = {
      id: data.id,
      email: userEmail,
      full_name: data.full_name,
      workspace_id: data.workspace_id,
      role: data.role ?? "member",
    };

    // Carrega o api_token do workspace e salva no contexto (e/ou localStorage)
    const { data: tokenData } = await supabase
      .from("api_tokens")
      .select("token")
      .eq("workspace_id", data.workspace_id)
      .eq("is_active", true)
      .maybeSingle();

    setTenant({
      workspaceId: p.workspace_id,
      token: tokenData?.token ?? "",
    });

    return p;
  } catch {
    return null;
  }
}
