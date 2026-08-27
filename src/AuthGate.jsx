import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const THEME_KEY = "personal-finance-theme";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(THEME_KEY) || "dark";
  });

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(currentSession);
        setCheckingSession(false);
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      setCheckingSession(false);

      if (event === "SIGNED_OUT") {
        setPassword("");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setMessageType("error");
      setMessage("Inserisci email e password.");
      return;
    }

    setSubmitting(true);
    setMessage("");
    setMessageType("");

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      setMessageType("error");

      if (error.message.toLowerCase().includes("invalid login credentials")) {
        setMessage("Email o password non corretti.");
      } else if (error.message.toLowerCase().includes("email not confirmed")) {
        setMessage("Devi confermare l'indirizzo email prima di accedere.");
      } else {
        setMessage(error.message);
      }

      setSubmitting(false);
      return;
    }

    setMessageType("success");
    setMessage("Accesso effettuato.");
    setSubmitting(false);
  }

  async function handleLogout() {
    setMessage("");
    await supabase.auth.signOut();
  }

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark",
    );
  }

  if (checkingSession) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="text-center">
          <div className="loading-orbit mx-auto">
            <LoaderCircle className="h-8 w-8 animate-spin" />
          </div>
          <p className="mt-5 text-sm font-medium text-slate-400">
            Prepariamo il tuo spazio
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <div className="auth-ambient auth-ambient-one" />
        <div className="auth-ambient auth-ambient-two" />

        <button
          type="button"
          onClick={toggleTheme}
          className="theme-switch theme-switch-auth"
          aria-label={
            theme === "dark"
              ? "Attiva la modalità chiara"
              : "Attiva la modalità scura"
          }
          title={theme === "dark" ? "Modalità chiara" : "Modalità scura"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="auth-layout">
          <section className="auth-story" aria-label="Presentazione">
            <div className="brand-mark brand-mark-large">
              <Landmark size={30} />
            </div>
            <p className="auth-eyebrow">PERSONAL FINANCE</p>
            <h1>
              Più chiarezza.
              <br />
              Meno rumore.
            </h1>
            <p className="auth-description">
              Uno spazio semplice e personale per seguire il denaro con calma,
              capire le abitudini e costruire obiettivi nel tempo.
            </p>
            <div className="auth-trust">
              <span className="auth-trust-icon">
                <ShieldCheck size={19} />
              </span>
              <span>
                <strong>Privato e sincronizzato</strong>
                <small>I dati restano associati al tuo account.</small>
              </span>
            </div>
          </section>

          <section className="auth-card" aria-labelledby="login-title">
            <div className="brand-mark auth-mobile-mark">
              <Landmark size={24} />
            </div>
            <p className="auth-eyebrow">BENTORNATO</p>
            <h2 id="login-title">Entra nel tuo spazio</h2>
            <p className="auth-card-description">
              Accedi per consultare e aggiornare le tue finanze.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <label className="block">
                <span className="field-label">Email</span>
                <div className="field-with-icon">
                  <Mail size={18} aria-hidden="true" />
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="nome@esempio.it"
                    className="h-12 pl-11"
                  />
                </div>
              </label>

              <label className="block">
                <span className="field-label">Password</span>
                <div className="field-with-icon">
                  <LockKeyhole size={18} aria-hidden="true" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Inserisci la password"
                    className="h-12 pl-11 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="password-visibility"
                    aria-label={
                      showPassword ? "Nascondi password" : "Mostra password"
                    }
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              {message && (
                <div
                  className={`auth-message ${
                    messageType === "error"
                      ? "auth-message-error"
                      : "auth-message-success"
                  }`}
                  role="status"
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting}
                className="h-12 w-full rounded-2xl"
              >
                {submitting ? (
                  <>
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Accesso in corso
                  </>
                ) : (
                  "Accedi"
                )}
              </Button>
            </form>

            <div className="auth-footnote">
              <ShieldCheck size={14} />
              Sessione protetta e mantenuta sul dispositivo
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <>
      {children}

      <div className="floating-controls" aria-label="Controlli applicazione">
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-switch"
          aria-label={
            theme === "dark"
              ? "Attiva la modalità chiara"
              : "Attiva la modalità scura"
          }
          title={theme === "dark" ? "Modalità chiara" : "Modalità scura"}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className="logout-button"
          aria-label="Esci dall'account"
        >
          <LogOut size={17} />
          <span>Esci</span>
        </button>
      </div>
    </>
  );
}
