import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Pencil, Trash2 } from "lucide-react";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const userSchema = z.object({
  email: z.string().trim().email({ message: "Email inválido" }).max(255, { message: "Email muito longo" }),
  password: z.string().min(6, { message: "A senha deve ter no mínimo 6 caracteres" }).max(100, { message: "Senha muito longa" }),
  role: z.enum(["gestor", "recreador"], { message: "Selecione um nível de acesso" }),
});

interface UserWithRole {
  id: string;
  email: string;
  role: "gestor" | "recreador" | null;
  created_at: string;
}

export const UsersManager = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"gestor" | "recreador">("recreador");
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editRole, setEditRole] = useState<"gestor" | "recreador">("recreador");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Fetch all user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      // Fetch all auth users
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) throw authError;

      // Combine data
      const usersWithRoles: UserWithRole[] = authUsers.map(user => {
        const userRole = rolesData?.find(r => r.user_id === user.id);
        return {
          id: user.id,
          email: user.email || "",
          role: userRole?.role as "gestor" | "recreador" | null,
          created_at: user.created_at
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("Erro ao carregar usuários");
    }
  };

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
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cadastrar usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      setLoading(true);

      // Update user role
      const { error } = await supabase
        .from("user_roles")
        .update({ role: editRole })
        .eq("user_id", editingUser.id);

      if (error) throw error;

      const roleText = editRole === "gestor" ? "Gestor" : "Recreador";
      toast.success(`Usuário atualizado para ${roleText} com sucesso!`);
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao atualizar usuário");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    try {
      setLoading(true);

      // Delete user (this will cascade delete the role)
      const { error } = await supabase.auth.admin.deleteUser(deleteUserId);

      if (error) throw error;

      toast.success("Usuário removido com sucesso!");
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast.error("Erro ao remover usuário");
      console.error(error);
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
            Cadastrar Novo Usuário
          </h3>
          <p className="text-sm text-muted-foreground">
            Crie credenciais de acesso para Gestores ou Recreadores
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Usuários Cadastrados</h3>
        {users.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum usuário cadastrado
          </p>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      user.role === "gestor" 
                        ? "bg-primary/10 text-primary" 
                        : user.role === "recreador"
                        ? "bg-secondary/10 text-secondary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {user.role === "gestor" ? "Gestor" : user.role === "recreador" ? "Recreador" : "Sem role"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • Cadastrado em {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {user.role && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditingUser(user);
                        setEditRole(user.role!);
                      }}
                      disabled={loading}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => setDeleteUserId(user.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nível de Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={editingUser?.email || ""} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Nível de Acesso</Label>
              <Select value={editRole} onValueChange={(value: "gestor" | "recreador") => setEditRole(value)}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Gestor - Acesso completo</SelectItem>
                  <SelectItem value="recreador">Recreador - Acesso limitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingUser(null)}>
                Cancelar
              </Button>
              <Button onClick={handleEditUser} disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita e o usuário perderá acesso ao sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
