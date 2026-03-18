const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!canSubmit) return;

  setLoading(true);
  setErrorMsg(null);

  try {
    const full_name = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    // 1) Cria usuário — trigger cuida do workspace e profile automaticamente
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    });

    if (signUpError) throw signUpError;

    // 2) Login automático
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) throw signInError;

    navigate("/overview", { replace: true });

  } catch (err: any) {
    setErrorMsg(err?.message || "Erro ao criar conta. Tente novamente.");
  } finally {
    setLoading(false);
  }
};
