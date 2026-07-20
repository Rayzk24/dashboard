export type PasswordChangeInput = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

export function emptyPasswordChangeInput(): PasswordChangeInput {
  return { currentPassword: "", newPassword: "", confirmation: "" };
}

type AuthUser = { id: string; email?: string | null };
type AuthResult = {
  data: { user: AuthUser | null };
  error: { message?: string } | null;
};

export type PasswordAuthClient = {
  getUser: () => Promise<AuthResult>;
  signInWithPassword: (credentials: {
    email: string;
    password: string;
  }) => Promise<AuthResult>;
  updateUser: (attributes: { password: string }) => Promise<AuthResult>;
};

export class PasswordChangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordChangeError";
  }
}

export function validatePasswordChange(input: PasswordChangeInput) {
  if (!input.currentPassword) return "Saisissez votre mot de passe actuel.";
  if (!input.newPassword)
    return "Saisissez votre nouveau mot de passe.";
  if (!input.confirmation)
    return "Confirmez votre nouveau mot de passe.";
  if (input.newPassword.length < 8)
    return "Le nouveau mot de passe doit contenir au moins 8 caractères.";
  if (input.newPassword === input.currentPassword)
    return "Le nouveau mot de passe doit être différent de l’ancien.";
  if (input.newPassword !== input.confirmation)
    return "Les deux nouveaux mots de passe ne correspondent pas.";
  return null;
}

function updateErrorMessage(message = "") {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("weak") ||
    normalized.includes("password") ||
    normalized.includes("characters")
  ) {
    return "Le nouveau mot de passe ne respecte pas les règles de sécurité du compte.";
  }
  return "Impossible de modifier le mot de passe pour le moment. Réessayez.";
}

export async function changeCurrentUserPassword(
  auth: PasswordAuthClient,
  input: PasswordChangeInput,
) {
  const validationError = validatePasswordChange(input);
  if (validationError) throw new PasswordChangeError(validationError);

  const current = await auth.getUser();
  if (current.error || !current.data.user)
    throw new PasswordChangeError(
      "Impossible de vérifier le compte actuellement connecté.",
    );

  const { id: userId, email } = current.data.user;
  if (!email)
    throw new PasswordChangeError(
      "Aucune adresse email n’est associée au compte connecté.",
    );

  const verification = await auth.signInWithPassword({
    email,
    password: input.currentPassword,
  });
  if (verification.error || verification.data.user?.id !== userId)
    throw new PasswordChangeError("Le mot de passe actuel est incorrect.");

  const update = await auth.updateUser({ password: input.newPassword });
  if (update.error)
    throw new PasswordChangeError(updateErrorMessage(update.error.message));
  if (update.data.user?.id !== userId)
    throw new PasswordChangeError(
      "La session du compte n’a pas pu être confirmée après la modification.",
    );

  return { userId };
}
