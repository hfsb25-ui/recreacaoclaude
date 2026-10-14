import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { supabase } from "@/integrations/supabase/client";
import { Award, ChevronLeft, ChevronRight, Trophy, LogOut, Calendar, Gamepad2, MessageSquare, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { PetMiniCard } from "@/components/pet/PetMiniCard";
import { HotelLayout, FONTE_TITULO } from "@/components/hotel/HotelLayout";

interface CheckIn {
  id: string;
  checked_in_at: string;
  points_earned: number;
  activities: {
    name: string;
  };
}

const GuestProfile = () => {
  const navigate = useNavigate();
  const { guest, currentLevel, nextLevel, logout, refreshGuest, loading: guestLoading } = useGuestAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    // Wait for guest data to load before checking
    if (guestLoading) return;
    
    if (!guest) {
      navigate("/guest-auth");
      return;
    }

    fetchCheckins();
    setPhone(guest.phone || "");
  }, [guest, guestLoading, navigate]);

  const fetchCheckins = async () => {
    if (!guest) return;

    const { data } = await supabase
      .from("activity_checkins")
      .select("*, activities(name)")
      .eq("guest_id", guest.id)
      .order("checked_in_at", { ascending: false })
      .limit(10);

    if (data) {
      setCheckins(data);
    }
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (guestLoading || loading) {
    return (
      <HotelLayout>
        <p className="p-10 text-center text-[#5B6B60]">Carregando perfil…</p>
      </HotelLayout>
    );
  }

  if (!guest || !currentLevel) {
    return null;
  }

  const progressToNextLevel = nextLevel
    ? ((guest.total_points - currentLevel.min_points) /
        (nextLevel.min_points - currentLevel.min_points)) *
      100
    : 100;

  const salvarTelefone = async () => {
    if (!guest) return;
    setSavingPhone(true);
    try {
      const { error } = await supabase
        .from("guests")
        .update({ phone: phone || null })
        .eq("id", guest.id);
      if (error) throw error;
      await refreshGuest();
      toast.success("Telefone atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSavingPhone(false);
    }
  };

  const cartao = "rounded-[20px] bg-white p-5 shadow-[0_2px_8px_rgba(20,40,30,0.06)]";

  return (
    <HotelLayout>
      <header className="flex flex-col gap-4 rounded-b-[28px] bg-[#1F4D3A] px-5 pb-7 pt-5 text-white">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/")}
            aria-label="Voltar"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-bold"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-4xl">
            {currentLevel.badge_emoji}
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate text-[26px] font-extrabold leading-tight" style={FONTE_TITULO}>
              {guest.name}
            </h1>
            <span className="text-[15px] text-white/90">Apto {guest.room_number}</span>
          </div>
        </div>
      </header>

      <main className="flex flex-col gap-4 p-5">
        <Link
          to="/estadia"
          className="flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-[0_2px_8px_rgba(20,40,30,0.06)]"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E7F0EA] text-[#1F4D3A]">
            <Receipt className="h-6 w-6" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="font-extrabold">Minha estadia</span>
            <span className="text-sm text-[#5B6B60]">Datas da reserva e consumo</span>
          </span>
          <ChevronRight className="h-5 w-5 text-[#5B6B60]" />
        </Link>

        <section aria-labelledby="recreacao" className={`${cartao} flex flex-col gap-3`}>
          <h2 id="recreacao" className="text-xl font-bold" style={FONTE_TITULO}>
            Minha recreação
          </h2>
          <div className="flex items-baseline justify-between">
            <span className="text-[22px] font-extrabold" style={FONTE_TITULO}>
              {guest.total_points} pontos
            </span>
            <span className="text-sm font-bold text-[#5B6B60]">
              Nível {currentLevel.level_number} · {currentLevel.name}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Progresso até o próximo nível"
            aria-valuenow={Math.round(progressToNextLevel)}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-[#EEF1EA]"
          >
            <div className="h-full rounded-full bg-[#1F4D3A]" style={{ width: `${Math.min(100, Math.max(0, progressToNextLevel))}%` }} />
          </div>
          {nextLevel && (
            <span className="text-[13px] text-[#5B6B60]">
              Faltam {Math.max(0, nextLevel.min_points - guest.total_points)} pontos para {nextLevel.name} {nextLevel.badge_emoji}
            </span>
          )}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {[
              { to: "/programacao", label: "Programação", Icon: Calendar },
              { to: "/games", label: "Jogos", Icon: Gamepad2 },
              { to: "/ranking", label: "Ranking", Icon: Trophy },
              { to: "/hall-of-fame", label: "Hall da Fama", Icon: Award },
            ].map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-[48px] items-center gap-2 rounded-xl bg-[#F4F6F0] px-3 text-[15px] font-extrabold"
              >
                <Icon className="h-5 w-5 text-[#1F4D3A]" />
                {label}
              </Link>
            ))}
          </div>
        </section>

        <PetMiniCard guestId={guest.id} />

        <section aria-labelledby="whats" className={`${cartao} flex flex-col gap-3`}>
          <h2 id="whats" className="flex items-center gap-2 text-xl font-bold" style={FONTE_TITULO}>
            <MessageSquare className="h-5 w-5 text-[#1E8E4E]" />
            WhatsApp dos lembretes
          </h2>
          <p className="text-sm text-[#5B6B60]">Cadastre seu número para receber lembretes das atividades.</p>
          <div className="flex gap-2.5">
            <input
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#C9D2C6] bg-[#FAFBF8] px-3.5 text-base outline-none focus:border-[#1F4D3A]"
              placeholder="5511999998888"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
              aria-label="Telefone WhatsApp"
            />
            <button
              type="button"
              disabled={savingPhone}
              onClick={salvarTelefone}
              className="flex h-12 items-center rounded-xl bg-[#1F4D3A] px-5 font-extrabold text-white disabled:opacity-60"
            >
              {savingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
            </button>
          </div>
        </section>

        <section aria-labelledby="checkins" className={`${cartao} flex flex-col gap-3`}>
          <h2 id="checkins" className="text-xl font-bold" style={FONTE_TITULO}>
            Últimos check-ins
          </h2>
          {checkins.length === 0 ? (
            <p className="text-[15px] text-[#5B6B60]">Você ainda não fez check-in em nenhuma atividade.</p>
          ) : (
            <div className="flex flex-col">
              {checkins.map((checkin, i) => (
                <div
                  key={checkin.id}
                  className={`flex items-center justify-between gap-3 py-2.5 ${i < checkins.length - 1 ? "border-b border-[#E6EAE3]" : ""}`}
                >
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{checkin.activities.name}</span>
                    <span className="text-[13px] text-[#5B6B60]">
                      {new Date(checkin.checked_in_at).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span className="shrink-0 font-extrabold text-[#1E6B3E]">+{checkin.points_earned} pts</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </HotelLayout>
  );
};

export default GuestProfile;
