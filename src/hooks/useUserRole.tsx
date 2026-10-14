import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type UserRole = "gestor" | "recreador" | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();

    // Recomendação do Supabase: não chamar o Supabase direto dentro deste aviso (pode travar a sessão)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => fetchUserRole(), 0);
    });
    // Garantia: se algo travar, para de carregar depois de 10 s
    const limite = setTimeout(() => setLoading(false), 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(limite);
    };
  }, []);

  const fetchUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } else {
        setRole(data?.role as UserRole);
      }
    } catch (error) {
      console.error("Error in fetchUserRole:", error);
      setRole(null);
    } finally {
      setLoading(false);
    }
  };

  return { role, loading, isGestor: role === "gestor", isRecreador: role === "recreador" };
};
