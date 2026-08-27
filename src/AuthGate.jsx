import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Landmark,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

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
    } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setCheckingSession(false);

        if (event === "SIGNED_OUT") {
          setPassword("");
        }
      },
    );

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

    const { error } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (error) {
      setMessageType("error");

      if (
        error.message
          .toLowerCase()
          .includes("invalid login credentials")
      ) {
        setMessage("Email o password non corretti.");
      } else if (
        error.message
          .toLowerCase()
          .includes("email not confirmed")
      ) {
        setMessage(
          "Devi confermare l'indirizzo email prima di accedere.",
        );
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

  if (checkingSession) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-emerald-400" />

          <p className="mt-4 text-sm text-slate-400">
            Verifica della sessione
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="absolute left-[-120px] top-[-120px] h-96 w-96 rounded-full bg-blue-600 opacity-20 blur-3xl" />

        <div className="absolute bottom-[-140px] right-[-100px] h-[420px] w-[420px] rounded-full bg-emerald-500 opacity-20 blur-3xl" />

        <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-5 py-10 lg:grid-cols-2 lg:px-8">
          <section className="hidden lg:block">
            <div className="mb-7 grid h-16 w-16 place-items-center rounded-3xl bg-white text-slate-950 shadow-2xl">
              <Landmark size={30} />
            </div>

            <h1 className="max-w-xl text-5xl font-black leading-tight tracking-tight">
              Tutte le tue finanze.
              <br />
              Finalmente chiare.
            </h1>

            <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-400">
              Entrate, spese, budget e investimenti in un unico
              spazio personale, protetto e progettato per durare
              negli anni.
            </p>

            <div className="mt-10 flex items-center gap-3 text-sm text-slate-300">
              <div className="rounded-2xl bg-emerald-400 p-3 text-slate-950">
                <ShieldCheck size={21} />
              </div>

              <div>
                <b className="block text-white">
                  Accesso protetto da Supabase
                </b>

                <span className="text-slate-500">
                  Ogni utente può accedere soltanto ai propri dati.
                </span>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <div className="mb-5 grid h-13 w-13 place-items-center rounded-2xl bg-white text-slate-950 lg:hidden">
                  <Landmark size={25} />
                </div>

                <p className="text-sm font-bold text-emerald-400">
                  PERSONAL FINANCE
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Bentornato
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Accedi per consultare e aggiornare le tue finanze.
                </p>
              </div>

              <form
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-200">
                    Email
                  </span>

                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />

                    <Input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) =>
                        setEmail(event.target.value)
                      }
                      placeholder="nome@esempio.it"
                      className="h-12 rounded-xl border-white/10 bg-slate-900/70 pl-12 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-slate-200">
                    Password
                  </span>

                  <div className="relative">
                    <LockKeyhole className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />

                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Inserisci la password"
                      className="h-12 rounded-xl border-white/10 bg-slate-900/70 pl-12 pr-12 text-white placeholder:text-slate-600 focus:border-emerald-400 focus:ring-emerald-400/20"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (currentValue) => !currentValue,
                        )
                      }
                      className="absolute right-4 top-3.5 text-slate-500 transition hover:text-white"
                      aria-label={
                        showPassword
                          ? "Nascondi password"
                          : "Mostra password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff size={20} />
                      ) : (
                        <Eye size={20} />
                      )}
                    </button>
                  </div>
                </label>

                {message && (
                  <div
                    className={`rounded-xl border p-3 text-sm ${
                      messageType === "error"
                        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                        : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full rounded-xl bg-emerald-400 text-base font-black text-slate-950 hover:bg-emerald-300"
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

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                <ShieldCheck size={14} />
                Sessione protetta e mantenuta sul dispositivo
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}

      <button
        type="button"
        onClick={handleLogout}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl border border-white/20 bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-2xl transition hover:bg-slate-800"
      >
        <LogOut size={17} />
        Esci
      </button>
    </>
  );
}