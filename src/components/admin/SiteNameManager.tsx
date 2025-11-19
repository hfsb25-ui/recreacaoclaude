import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const SiteNameManager = () => {
  const [siteName, setSiteName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSiteName();
  }, []);

  const fetchSiteName = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("site_name")
      .single();

    if (data?.site_name) {
      setSiteName(data.site_name);
    }
  };

  const handleSave = async () => {
    if (!siteName.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o nome do site",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("site_settings")
      .update({ site_name: siteName.trim() })
      .eq("id", (await supabase.from("site_settings").select("id").single()).data?.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Nome do site atualizado",
      description: "O nome aparecerá na página de programação",
    });
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Nome do Site</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Este nome aparecerá no topo da página de programação
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="siteName">Nome do Site</Label>
          <Input
            id="siteName"
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
            placeholder="Ex: Recreação Hotel Paradise"
          />
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar Nome do Site"}
        </Button>
      </div>
    </Card>
  );
};
