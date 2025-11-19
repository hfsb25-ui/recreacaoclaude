import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const userSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255, { message: "Email muito longo" }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }).max(100, { message: "Senha muito longa" }),
  role: z.enum(["gestor", "recreador"], { message: "Selecione um nível de acesso" }),
});

export const UsersManager = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"gestor" | "recreador">("recreador");

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = userSchema.safeParse({ email: email.trim(), password, role });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    try {
      setLoading(true);
      
      // Create user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Erro ao criar usuário");

      // Assign role to user
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: signUpData.user.id,
          role: validation.data.role,
        });

      if (roleError) throw roleError;

      const roleText = validation.data.role === "gestor" ? "Gestor" : "Recreador";
      toast.success(`Novo usuário ${roleText} cadastrado com sucesso!`);
      setEmail("");
      setPassword("");
      setRole("recreador");
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastrar Novo Usuário Admin
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie credenciais de acesso para outros administradores do sistema
          </p>
        </div>
        
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="usuario@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Senha</Label>
            <Input
              id="user-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-role">Nível de Acesso</Label>
            <Select value={role} onValueChange={(value: "gestor" | "recreador") => setRole(value)}>
              <SelectTrigger id="user-role">
                <SelectValue placeholder="Selecione o nível de acesso" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gestor">Gestor - Acesso completo ao sistema</SelectItem>
                <SelectItem value="recreador">Recreador - Acesso a faixas etárias, atividades e PDF</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Gestores têm acesso completo. Recreadores só podem gerenciar faixas etárias e atividades.
            </p>
          </div>
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            {loading ? "Cadastrando..." : "Cadastrar Usuário"}
          </Button>
        </form>
      </Card>
    </div>
  );
};
