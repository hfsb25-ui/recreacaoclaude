import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, Hotel, Megaphone, Trophy } from "lucide-react";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { toast } from "sonner";
import { CelebrationModal } from "@/components/CelebrationModal";
import { HotelLogo, FONTE_TITULO } from "@/components/hotel/HotelLayout";
import { MascoteCorpo } from "@/components/hotel/Mascote";
import { useHotelInfo, linkWhatsapp, ramalRecepcao } from "@/hooks/useHotelInfo";

const campo =
  "h-12 w-full rounded-xl border border-[#C9D2C6] bg-[#FAFBF8] px-3.5 text-base text-[#1D2A22] outline-none focus:border-[#1F4D3A] focus:ring-2 focus:ring-[#1F4D3A]/20";
const rotulo = "text-sm font-bold";

const GuestAuth = () => {
  const navigate = useNavigate();
  const { login, register, loginByStay } = useGuestAuth();
  const info = useHotelInfo();
  const ramal = ramalRecepcao(info);
  // "stay" = apto + sobrenome (TOTVS); "pin" = entrar com PIN; "register" = cadastro manual
  const [mode, setMode] = useState<"stay" | "pin" | "register">("stay");
  const isLogin = mode === "pin";
  const [surname, setSurname] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [pin, setPin] = useState("");
  const [phone, setPhone] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [registeredName, setRegisteredName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "stay") {
        const result = await loginByStay(roomNumber, surname);
        if (!result) {
          setNotFound(true);
          toast.error("Não encontramos uma reserva com esse apartamento e sobrenome");
          return;
        }
        if (result.isNew) {
          setRegisteredName(result.guest.name);
          setShowCelebration(true);
        } else {
          toast.success(`Bem-vindo de volta, ${result.guest.name.split(" ")[0]}!`);
          navigate("/");
        }
      } else if (isLogin) {
        await login(roomNumber, pin);
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        await register(name, roomNumber, pin, phone ? `55${phone}` : undefined);
        setRegisteredName(name);
        setShowCelebration(true);
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const handleCelebrationClose = () => {
    setShowCelebration(false);
    navigate("/");
  };

  const titulo =
    mode === "stay" ? "Entrar como hóspede" : isLogin ? "Entrar com PIN" : "Criar cadastro";

  return (
    <div className="min-h-[100dvh] w-full bg-[#F4F6F0] text-[#1D2A22]" style={{ fontFamily: "'Nunito', system-ui, sans-serif" }}>
      <div className="mx-auto w-full max-w-md">
        <header className="relative flex flex-col gap-5 overflow-hidden rounded-b-[32px] bg-[#1F4D3A] px-6 pb-9 pt-6 text-white">
          <MascoteCorpo className="absolute -bottom-3 right-1 h-[230px] w-auto" />
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Voltar ao início"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-3">
            <HotelLogo size={64} />
            <div className="flex flex-col leading-tight">
              <span className="text-xl font-bold" style={FONTE_TITULO}>
                Hotel Fazenda
              </span>
              <span className="text-[15px] text-white/85">Santa Bárbara</span>
            </div>
          </div>
          <div className="relative flex max-w-[64%] flex-col gap-1.5">
            <h1 className="text-[30px] font-extrabold leading-tight" style={FONTE_TITULO}>
              Bem-vindo à fazenda!
            </h1>
            <p className="text-base leading-snug text-white/90">
              {mode === "stay"
                ? "Entre com seu apartamento para ver a programação, seus pontos e seu consumo."
                : isLogin
                ? "Entre com o número do quarto e o PIN que você criou."
                : "Cadastre-se e ganhe 50 pontos de boas-vindas!"}
            </p>
          </div>
        </header>

        <main className="flex flex-col gap-6 px-5 py-6">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3.5 rounded-[20px] bg-white p-5 shadow-[0_6px_20px_rgba(20,40,30,0.08)]"
          >
            <h2 className="text-xl font-bold" style={FONTE_TITULO}>
              {titulo}
            </h2>

            {mode === "register" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className={rotulo}>Nome completo</span>
                  <input className={campo} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className={rotulo}>WhatsApp (opcional)</span>
                  <div className="flex items-center gap-2">
                    <span className="flex h-12 items-center rounded-xl border border-[#C9D2C6] bg-[#EEF1EA] px-3 text-sm font-bold text-[#5B6B60]">
                      +55
                    </span>
                    <input
                      className={campo}
                      type="tel"
                      inputMode="tel"
                      placeholder="DDD + número"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>
                </label>
              </>
            )}

            <label className="flex flex-col gap-1.5">
              <span className={rotulo}>Apartamento</span>
              <input
                className={campo}
                type="text"
                inputMode="numeric"
                placeholder="Ex.: 213"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setNotFound(false);
                }}
                required
              />
            </label>

            {mode === "stay" ? (
              <label className="flex flex-col gap-1.5">
                <span className={rotulo}>Sobrenome de alguém do quarto</span>
                <input
                  className={campo}
                  type="text"
                  autoCapitalize="words"
                  placeholder="Ex.: Silva"
                  value={surname}
                  onChange={(e) => {
                    setSurname(e.target.value);
                    setNotFound(false);
                  }}
                  required
                />
              </label>
            ) : (
              <label className="flex flex-col gap-1.5">
                <span className={rotulo}>PIN de 4 dígitos</span>
                <input
                  className={campo}
                  type="password"
                  inputMode="numeric"
                  placeholder="••••"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </label>
            )}

            {notFound && mode === "stay" && (
              <p className="rounded-xl bg-[#FDECEA] p-3 text-sm text-[#8A1C12]">
                Confira o número do apartamento e o sobrenome. Se você acabou de chegar, aguarde alguns minutos ou fale com
                a recepção{ramal ? ` (ramal ${ramal})` : ""}.
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-[50px] rounded-xl bg-[#1F4D3A] text-base font-extrabold text-white disabled:opacity-60"
            >
              {loading ? "Entrando…" : mode === "register" ? "Cadastrar e ganhar 50 pontos" : "Entrar"}
            </button>

            {mode !== "stay" && (
              <div className="flex flex-col items-center gap-2 pt-1 text-sm">
                <>
                  <button
                    type="button"
                    onClick={() => setMode(isLogin ? "register" : "pin")}
                    className="font-bold text-[#1F4D3A] underline"
                  >
                    {isLogin ? "Não tem cadastro? Cadastre-se" : "Já tem cadastro? Entre com PIN"}
                  </button>
                  <button type="button" onClick={() => setMode("stay")} className="text-[#5B6B60] underline">
                    Entrar com apartamento e sobrenome
                  </button>
                </>
              </div>
            )}
          </form>

          <section aria-labelledby="sem-login" className="flex flex-col gap-2.5">
            <h2 id="sem-login" className="text-sm font-extrabold uppercase tracking-wide text-[#5B6B60]">
              Sem entrar, você pode ver
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { to: "/programacao", label: "Programação", Icon: CalendarDays },
                { to: "/hotel", label: "O hotel", Icon: Hotel },
                { to: "/ranking", label: "Ranking", Icon: Trophy },
                { to: "/avisos", label: "Avisos", Icon: Megaphone },
              ].map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-[60px] items-center gap-2.5 rounded-2xl bg-white p-3.5 text-[15px] font-extrabold shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
                >
                  <Icon className="h-[22px] w-[22px] text-[#1F4D3A]" />
                  {label}
                </Link>
              ))}
            </div>
          </section>

          <p className="text-center text-[13px] leading-relaxed text-[#5B6B60]">
            Dúvidas? Fale com a recepção{ramal ? ` pelo ramal ${ramal}` : ""} ou no{" "}
            <a href={linkWhatsapp(info)} target="_blank" rel="noopener noreferrer" className="font-extrabold text-[#1F4D3A] underline">
              WhatsApp do hotel
            </a>
            .
          </p>
        </main>
      </div>

      <CelebrationModal isOpen={showCelebration} onClose={handleCelebrationClose} guestName={registeredName} points={50} />
    </div>
  );
};

export default GuestAuth;
