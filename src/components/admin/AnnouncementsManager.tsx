import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Upload, Image as ImageIcon, ArrowUp, ArrowDown } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

const AnnouncementsManager = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
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
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("announcements")
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;
        imageUrl = fileName;
      }

      const { error } = await supabase.from("announcements").insert({
        title,
        description: description || null,
        image_url: imageUrl,
        is_active: isActive,
        sort_order: announcements.length,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Anúncio cadastrado com sucesso!",
      });

      setTitle("");
      setDescription("");
      setImageFile(null);
      setIsActive(true);
      fetchAnnouncements();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar anúncio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    const { data } = supabase.storage.from("announcements").getPublicUrl(path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Cadastrar Novo Anúncio</h2>
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
            {loading ? "Cadastrando..." : "Cadastrar Anúncio"}
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
              <Card key={announcement.id} className="p-4">
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
                        <p className="text-xs text-muted-foreground mt-2">
                          Status: {announcement.is_active ? "Ativo" : "Inativo"}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
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
