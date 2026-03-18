import { supabaseAdmin } from "./supabaseAdmin.js";
import { fail } from "./response.js";
import { createClient } from "@supabase/supabase-js";

export async function requireAuth(req, res) {
  const token = req.headers["x-api-token"] || req.query?.["x-api-token"];
  const workspaceId = req.headers["workspace_id"] || req.query?.workspace_id;
  const authHeader = req.headers["authorization"];

  const sb = await supabaseAdmin();

  // MÉTODO 1: JWT do Supabase (Authorization: Bearer <jwt>)
  if (authHeader && authHeader.startsWith("Bearer ") && !token) {
    const jwt = authHeader.replace("Bearer ", "").trim();
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const clientWithJwt = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${jwt}` } },
        auth: { persistSession: false }
      });

      const { data: { user }, error: userError } = await clientWithJwt.auth.getUser(jwt);

      if (!userError && user) {
        // Busca workspace_id do perfil
        const { data: profile } = await sb
          .from("user_profiles")
          .select("workspace_id")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.workspace_id) {
          // Busca token da API para esse workspace
          const { data: tokenData } = await sb
            .from("api_tokens")
            .select("token")
            .eq("workspace_id", profile.workspace_id)
            .eq("is_active", true)
            .maybeSingle();

          return {
            workspace_id: String(profile.workspace_id),
            token: tokenData?.token || "",
            user_id: user.id,
          };
        }
      }
    }
  }

  // MÉTODO 2: x-api-token + workspace_id (método original)
  if (!token)       return fail(res, "MISSING_X_API_TOKEN", 401);
  if (!workspaceId) return fail(res, "MISSING_WORKSPACE_ID", 401);

  const { data, error } = await sb
    .from("api_tokens")
    .select("token, workspace_id, is_active")
    .eq("token", token).eq("workspace_id", workspaceId).eq("is_active", true)
    .maybeSingle();

  if (error) return fail(res, "AUTH_QUERY_FAILED", 500, { details: error });
  if (!data)  return fail(res, "INVALID_TOKEN_OR_WORKSPACE", 403);

  return { workspace_id: String(workspaceId), token: String(token) };
}
