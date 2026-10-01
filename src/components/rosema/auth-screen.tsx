import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { DEMO_ACCOUNTS, type FieldName } from "@/lib/rosema/logic";
import { useRosema } from "@/lib/rosema/store";
import { cn } from "@/lib/cn";

const fieldClass = "field mt-1";

export function AuthScreen() {
  const register = useRosema((s) => s.register);
  const login = useRosema((s) => s.login);
  const loginGuest = useRosema((s) => s.loginGuest);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<{ field: FieldName; message: string } | null>(null);

  function submit() {
    const result =
      mode === "login"
        ? login(username, password)
        : register({ username, password, passwordConfirm });
    setError(result.ok ? null : { field: result.field, message: result.error });
  }

  return (
    <div className="grid h-dvh place-items-center overflow-auto bg-bg px-4 py-8 text-fg">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-rose text-xl font-semibold text-white">R</span>
          <div>
            <h1 className="text-2xl font-semibold">Rosema</h1>
            <p className="text-sm text-muted">Мессенджер</p>
          </div>
        </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface p-1" role="tablist">
            {(
              [
                ["login", "Вход"],
                ["register", "Регистрация"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={mode === id}
                className={cn(
                  "h-11 rounded-md text-sm font-medium",
                  mode === id ? "bg-rose text-on-rose" : "text-muted",
                )}
                onClick={() => {
                  setMode(id);
                  setError(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <label className="block text-sm">
              Имя пользователя
              <input
                className={cn("mt-1", fieldClass, error?.field === "username" && "border-warn")}
                autoComplete="username"
                spellCheck={false}
                value={username}
                placeholder="rose_01"
                onChange={(event) => setUsername(event.target.value)}
              />
              <span className="mt-1 block text-xs text-muted">Латиница, с буквы, 4–20 символов</span>
            </label>

            <label className="block text-sm">
              Пароль
              <span className="relative mt-1 block">
                <input
                  className={cn("pr-12", fieldClass, error?.field === "password" && "border-warn")}
                  type={showPass ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 grid size-12 place-items-center text-muted"
                  aria-label={showPass ? "Скрыть пароль" : "Показать пароль"}
                  onClick={() => setShowPass((value) => !value)}
                >
                  {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
              {mode === "register" ? (
                <span className="mt-1 block text-xs text-muted">8–20 символов, буква и цифра</span>
              ) : null}
            </label>

            {mode === "register" ? (
              <label className="block text-sm">
                Пароль ещё раз
                <input
                  className={cn("mt-1", fieldClass, error?.field === "passwordConfirm" && "border-warn")}
                  type={showPass ? "text" : "password"}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                />
              </label>
            ) : null}

            {error ? (
              <p className="text-sm text-warn" role="alert">
                {error.message}
              </p>
            ) : null}

            <button type="submit" className="h-12 w-full rounded-full bg-rose text-sm font-medium text-on-rose">
              {mode === "login" ? "Войти" : "Создать учётную запись"}
            </button>
          </form>

          <div className="mt-8 border-t border-line pt-6">
            <p className="text-xs text-muted">Демо-учётки, пароль у всех Pass1234</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  className="h-11 rounded-lg border border-line bg-surface px-3 text-sm"
                  onClick={() => {
                    setMode("login");
                    setUsername(account.username);
                    setPassword(account.password);
                    const result = login(account.username, account.password);
                    setError(result.ok ? null : { field: result.field, message: result.error });
                  }}
                >
                  {account.label}
                  <span className="ml-2 text-muted">{account.username}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 h-11 text-sm text-muted underline-offset-4 hover:underline"
              onClick={loginGuest}
            >
              Войти как гость — только канал
            </button>
          </div>
        </div>
    </div>
  );
}
