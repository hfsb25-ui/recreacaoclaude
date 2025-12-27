import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown, Eye, EyeOff, Pencil, X } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  button_text: string | null;
  button_url: string | null;
}

const AnnouncementsManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .order("sort_order", { ascending: true });

    if (data) setAnnouncements(data);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check dimensions
      const img = new window.Image();
      img.onload = () => {
        if (img.width === 720 && img.height === 200) {
          setImageFile(file);
          toast({
            title: "Imagem selecionada",
            description: "Dimensões corretas: 720x200",
          });
        } else {
          toast({
            title: "Dimensões incorretas",
            description: `A imagem deve ter 720x200 pixels. Atual: ${img.width}x${img.height}`,
            variant: "destructive",
          });
          e.target.value = "";
        }
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      let imageUrl = editingImageUrl;

      if (imageFile) {
        // Delete old image if editing and replacing
        if (editingId && editingImageUrl) {
          await supabase.storage.from("announcements").remove([editingImageUrl]);
        }

        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("announcements")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        imageUrl = fileName;
      }

      if (editingId) {
        // Update existing announcement
        const { error } = await supabase
          .from("announcements")
          .update({
            title,
            description: description || null,
            image_url: imageUrl,
            is_active: isActive,
            button_text: buttonText || null,
            button_url: buttonUrl || null,
          })
          .eq("id", editingId);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Anúncio atualizado com sucesso!",
        });
      } else {
        // Insert new announcement
        const { error } = await supabase.from("announcements").insert({
          title,
          description: description || null,
          image_url: imageUrl,
          is_active: isActive,
          sort_order: announcements.length,
          button_text: buttonText || null,
          button_url: buttonUrl || null,
        });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Anúncio cadastrado com sucesso!",
        });
      }

      resetForm();
      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: editingId ? "Erro ao atualizar anúncio" : "Erro ao cadastrar anúncio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setImageFile(null);
    setIsActive(true);
    setButtonText("");
    setButtonUrl("");
    setEditingId(null);
    setEditingImageUrl(null);
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setDescription(announcement.description || "");
    setIsActive(announcement.is_active);
    setButtonText(announcement.button_text || "");
    setButtonUrl(announcement.button_url || "");
    setEditingImageUrl(announcement.image_url);
    setImageFile(null);
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, imageUrl: string | null) => {
    try {
      if (imageUrl) {
        await supabase.storage.from("announcements").remove([imageUrl]);
      }

      const { error } = await supabase
        .from("announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anúncio excluído com sucesso!",
      });

      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir anúncio",
        variant: "destructive",
      });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const currentItem = announcements[index];
    const previousItem = announcements[index - 1];
    
    try {
      await supabase
        .from("announcements")
        .update({ sort_order: previousItem.sort_order })
        .eq("id", currentItem.id);
      
      await supabase
        .from("announcements")
        .update({ sort_order: currentItem.sort_order })
        .eq("id", previousItem.id);
      
      toast({
        title: "Sucesso",
        description: "Ordem alterada com sucesso!",
      });
      
      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar ordem",
        variant: "destructive",
      });
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === announcements.length - 1) return;
    
    const currentItem = announcements[index];
    const nextItem = announcements[index + 1];
    
    try {
      await supabase
        .from("announcements")
        .update({ sort_order: nextItem.sort_order })
        .eq("id", currentItem.id);
      
      await supabase
        .from("announcements")
        .update({ sort_order: currentItem.sort_order })
        .eq("id", nextItem.id);
      
      toast({
        title: "Sucesso",
        description: "Ordem alterada com sucesso!",
      });
      
      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar ordem",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("announcements")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Anúncio ${!currentStatus ? "ativado" : "desativado"} com sucesso!`,
      });

      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status do anúncio",
        variant: "destructive",
      });
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("announcements").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">
            {editingId ? "Editar Anúncio" : "Cadastrar Novo Anúncio"}
          </h2>
          {editingId && (
            <Button variant="ghost" size="sm" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Cancelar Edição
            </Button>
          )}
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título do anúncio"
            />
          </div>

          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite a descrição do anúncio"
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="image">Imagem (720x200 pixels)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {imageFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Arquivo selecionado: {imageFile.name}
              </p>
            )}
            {editingImageUrl && !imageFile && (
              <p className="text-sm text-primary mt-2">
                ✓ Imagem atual será mantida (selecione outra para substituir)
              </p>
            )}
          </div>

          <div className="border-t border-border pt-4 mt-4">
            <h3 className="font-semibold mb-3 text-foreground">Botão de Ação (opcional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buttonText">Texto do Botão</Label>
                <Input
                  id="buttonText"
                  value={buttonText}
                  onChange={(e) => setButtonText(e.target.value)}
                  placeholder="Ex: Saiba Mais"
                />
              </div>
              <div>
                <Label htmlFor="buttonUrl">Link do Botão</Label>
                <Input
                  id="buttonUrl"
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  placeholder="Ex: https://exemplo.com"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Se preenchidos, um botão será exibido abaixo da descrição do anúncio.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
            <Label htmlFor="is_active">Ativo</Label>
          </div>

          <Button type="submit" disabled={loading}>
            {loading 
              ? (editingId ? "Atualizando..." : "Cadastrando...") 
              : (editingId ? "Atualizar Anúncio" : "Cadastrar Anúncio")
            }
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Anúncios Cadastrados</h2>
        {announcements.length === 0 ? (
          <p className="text-muted-foreground">Nenhum anúncio cadastrado ainda.</p>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, index) => (
              <Card 
                key={announcement.id} 
                className={`p-4 ${!announcement.is_active ? "opacity-60 grayscale" : ""}`}
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  {announcement.image_url && (
                    <div className="flex-shrink-0 w-full sm:w-[180px] h-[80px] sm:h-[50px] bg-muted rounded overflow-hidden">
                      <img
                        src={getImageUrl(announcement.image_url) || ""}
                        alt={announcement.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  {!announcement.image_url && (
                    <div className="flex-shrink-0 w-full sm:w-[180px] h-[80px] sm:h-[50px] bg-muted rounded flex items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold break-words">{announcement.title}</h3>
                        {announcement.description && (
                          <p className="text-sm text-muted-foreground mt-1 break-words">
                            {announcement.description}
                          </p>
                        )}
                        {announcement.button_text && announcement.button_url && (
                          <p className="text-xs text-primary mt-1">
                            🔗 Botão: "{announcement.button_text}" → {announcement.button_url}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Switch
                            checked={announcement.is_active}
                            onCheckedChange={() => handleToggleActive(announcement.id, announcement.is_active)}
                          />
                          {announcement.is_active ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-xs text-muted-foreground">
                            {announcement.is_active ? "Visível" : "Oculto"}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(announcement)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleMoveDown(index)}
                          disabled={index === announcements.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() =>
                            handleDelete(announcement.id, announcement.image_url)
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AnnouncementsManager;
