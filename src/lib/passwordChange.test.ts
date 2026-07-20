import { describe, expect, it, vi } from "vitest";
import {
  changeCurrentUserPassword,
  emptyPasswordChangeInput,
  type PasswordAuthClient,
  validatePasswordChange,
} from "./passwordChange";

const user = { id: "user-1", email: "rayzk@example.test" };
const success = { data: { user }, error: null };

function authMock(overrides: Partial<PasswordAuthClient> = {}) {
  return {
    getUser: vi.fn(async () => success),
    signInWithPassword: vi.fn(async () => success),
    updateUser: vi.fn(async () => success),
    ...overrides,
  } satisfies PasswordAuthClient;
}

const validInput = {
  currentPassword: "ancien-secret",
  newPassword: "nouveau-secret",
  confirmation: "nouveau-secret",
};

describe("validation du changement de mot de passe", () => {
  it("refuse le formulaire vide", () => {
    expect(validatePasswordChange(emptyPasswordChangeInput())).toBe(
      "Saisissez votre mot de passe actuel.",
    );
  });

  it("refuse un mot de passe trop court", () => {
    expect(
      validatePasswordChange({
        currentPassword: "ancien-secret",
        newPassword: "court",
        confirmation: "court",
      }),
    ).toContain("au moins 8 caractères");
  });

  it("refuse un nouveau mot de passe identique à l’ancien", () => {
    expect(
      validatePasswordChange({
        currentPassword: "meme-secret",
        newPassword: "meme-secret",
        confirmation: "meme-secret",
      }),
    ).toContain("différent de l’ancien");
  });

  it("refuse deux nouveaux mots de passe différents", () => {
    expect(
      validatePasswordChange({
        ...validInput,
        confirmation: "autre-secret",
      }),
    ).toContain("ne correspondent pas");
  });

  it("fournit des champs nettoyés après fermeture ou réussite", () => {
    expect(emptyPasswordChangeInput()).toEqual({
      currentPassword: "",
      newPassword: "",
      confirmation: "",
    });
  });
});

describe("changement sécurisé via Supabase Auth", () => {
  it("vérifie le mot de passe actuel avant d’appeler updateUser", async () => {
    const auth = authMock();
    await changeCurrentUserPassword(auth, validInput);
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: user.email,
      password: validInput.currentPassword,
    });
    expect(
      vi.mocked(auth.signInWithPassword).mock.invocationCallOrder[0],
    ).toBeLessThan(
      vi.mocked(auth.updateUser).mock.invocationCallOrder[0],
    );
  });

  it("n’appelle jamais updateUser si le mot de passe actuel est incorrect", async () => {
    const auth = authMock({
      signInWithPassword: vi.fn(async () => ({
        data: { user: null },
        error: { message: "Invalid login credentials" },
      })),
    });
    await expect(changeCurrentUserPassword(auth, validInput)).rejects.toThrow(
      "Le mot de passe actuel est incorrect.",
    );
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("conserve exactement le même utilisateur", async () => {
    const auth = authMock();
    await expect(changeCurrentUserPassword(auth, validInput)).resolves.toEqual({
      userId: user.id,
    });
  });

  it("refuse une identité différente après la mise à jour", async () => {
    const auth = authMock({
      updateUser: vi.fn(async () => ({
        data: { user: { ...user, id: "user-2" } },
        error: null,
      })),
    });
    await expect(changeCurrentUserPassword(auth, validInput)).rejects.toThrow(
      "session du compte",
    );
  });

  it("reste en attente et bloque la mise à jour tant que la vérification n’est pas terminée", async () => {
    let resolveVerification: ((value: typeof success) => void) | undefined;
    const verification = new Promise<typeof success>((resolve) => {
      resolveVerification = resolve;
    });
    const auth = authMock({
      signInWithPassword: vi.fn(() => verification),
    });
    const request = changeCurrentUserPassword(auth, validInput);
    expect(auth.updateUser).not.toHaveBeenCalled();
    resolveVerification?.(success);
    await request;
    expect(auth.updateUser).toHaveBeenCalledOnce();
  });

  it("transforme une erreur de politique Supabase en message lisible", async () => {
    const auth = authMock({
      updateUser: vi.fn(async () => ({
        data: { user: null },
        error: { message: "Password should contain more characters" },
      })),
    });
    await expect(changeCurrentUserPassword(auth, validInput)).rejects.toThrow(
      "règles de sécurité du compte",
    );
  });
});
