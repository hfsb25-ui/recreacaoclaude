import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGuestAuth } from "@/hooks/useGuestAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { CelebrationModal } from "@/components/CelebrationModal";

const GuestAuth = () => {
  const navigate = useNavigate();
  const { login, register, loginByStay } = useGuestAuth();
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
          navigate("/guest-profile");
        }
      } else if (isLogin) {
        await login(roomNumber, pin);
        toast.success("Login realizado com sucesso!");
        navigate("/guest-profile");
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
    navigate("/guest-profile");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-bg)] p-6">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent mb-2">
            🎮 Área do Hóspede
          </h1>
          <p className="text-muted-foreground">
            {mode === "stay"
              ? "Entre com o número do apartamento e o sobrenome do titular da reserva 🎁"
              : isLogin
              ? "Entre para acompanhar seus pontos"
              : "Cadastre-se e ganhe 50 pontos de boas-vindas! 🎁"}
          </p>
        </div>

        {mode === "stay" ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stay-room">Número do Apartamento</Label>
              <Input
                id="stay-room"
                type="text"
                inputMode="numeric"
                placeholder="Ex: 305"
                value={roomNumber}
                onChange={(e) => {
                  setRoomNumber(e.target.value);
                  setNotFound(false);
                }}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stay-surname">Sobrenome do titular da reserva</Label>
              <Input
                id="stay-surname"
                type="text"
                autoCapitalize="words"
                placeholder="Ex: Silva"
                value={surname}
                onChange={(e) => {
                  setSurname(e.target.value);
                  setNotFound(false);
                }}
                required
              />
            </div>

            {notFound && (
              <p className="text-sm text-destructive">
                Confira o número do apartamento e o sobrenome de quem fez a reserva. Se você acabou de chegar, aguarde
                alguns minutos ou procure a recepção.
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>

            <div className="text-center">
              <button type="button" onClick={() => setMode("pin")} className="text-sm text-primary hover:underline">
                Já tem PIN ou não está hospedado? Clique aqui
              </button>
            </div>
          </form>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone WhatsApp (opcional)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-2 rounded-md border">+55</span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="11999998888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Digite DDD + número. Ex: 11999998888
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="room">Número do Quarto</Label>
            <Input
              id="room"
              type="text"
              placeholder="Ex: 305"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin">PIN de 4 Dígitos</Label>
            <Input
              id="pin"
              type="password"
              placeholder="••••"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Processando..." : isLogin ? "Entrar" : "Cadastrar e Ganhar 50 Pontos! 🎉"}
          </Button>
        </form>
        )}

        {mode !== "stay" && (
          <div className="mt-6 text-center space-y-2">
            <button
              onClick={() => setMode(isLogin ? "register" : "pin")}
              className="text-sm text-primary hover:underline block mx-auto"
            >
              {isLogin ? "Não tem cadastro? Cadastre-se" : "Já tem cadastro? Entre"}
            </button>
            <button onClick={() => setMode("stay")} className="text-sm text-muted-foreground hover:underline block mx-auto">
              Entrar com apartamento e sobrenome
            </button>
          </div>
        )}
      </Card>

      <CelebrationModal
        isOpen={showCelebration}
        onClose={handleCelebrationClose}
        guestName={registeredName}
        points={50}
      />
    </div>
  );
};

export default GuestAuth;
