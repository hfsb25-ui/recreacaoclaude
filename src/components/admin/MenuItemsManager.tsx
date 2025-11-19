import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MenuItem {
  id: string;
  title: string;
  url: string;
  sort_order: number;
  is_active: boolean;
}

export const MenuItemsManager = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) {
      toast({
        title: "Erro ao carregar itens do menu",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (data) setMenuItems(data);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newUrl.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o título e o link",
        variant: "destructive",
      });
      return;
    }

    const maxOrder = menuItems.reduce((max, item) => Math.max(max, item.sort_order), -1);

    const { error } = await supabase.from("menu_items").insert({
      title: newTitle.trim(),
      url: newUrl.trim(),
      sort_order: maxOrder + 1,
      is_active: true,
    });

    if (error) {
      toast({
        title: "Erro ao adicionar item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item adicionado",
      description: "Item do menu adicionado com sucesso",
    });

    setNewTitle("");
    setNewUrl("");
    fetchMenuItems();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);

    if (error) {
      toast({
        title: "Erro ao excluir item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Item excluído",
      description: "Item do menu excluído com sucesso",
    });

    fetchMenuItems();
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao atualizar item",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    fetchMenuItems();
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Adicionar Item ao Menu</h3>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Ex: Sobre Nós"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="url">Link</Label>
            <Input
              id="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Ex: /sobre ou https://exemplo.com"
            />
          </div>
          <Button onClick={handleAdd} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Item
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Itens do Menu</h3>
        {menuItems.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">
            Nenhum item cadastrado
          </Card>
        ) : (
          menuItems.map((item) => (
            <Card key={item.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{item.title}</h4>
                  <p className="text-sm text-muted-foreground break-all">{item.url}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant={item.is_active ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleToggleActive(item.id, item.is_active)}
                  >
                    {item.is_active ? "Ativo" : "Inativo"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
