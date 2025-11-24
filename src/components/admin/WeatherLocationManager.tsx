import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MapPin, Loader2 } from "lucide-react";

export const WeatherLocationManager = () => {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [cityName, setCityName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWeatherLocation();
  }, []);

  const fetchWeatherLocation = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("weather_latitude, weather_longitude, weather_city_name")
        .single();

      if (error) throw error;

      if (data) {
        setLatitude(data.weather_latitude?.toString() || "");
        setLongitude(data.weather_longitude?.toString() || "");
        setCityName(data.weather_city_name || "");
      }
    } catch (error) {
      console.error("Erro ao carregar localização:", error);
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!latitude || !longitude) {
      toast.error("Por favor, preencha latitude e longitude");
      return;
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Coordenadas inválidas");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .update({
          weather_latitude: lat,
          weather_longitude: lng,
          weather_city_name: cityName || null,
        })
        .eq("id", (await supabase.from("site_settings").select("id").single()).data?.id);

      if (error) throw error;

      toast.success("Localização do clima atualizada!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Localização do Clima
        </CardTitle>
        <CardDescription>
          Configure a localização para exibir informações meteorológicas na página inicial
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="latitude">Latitude</Label>
            <Input
              id="latitude"
              type="text"
              placeholder="-23.5505"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ex: -23.5505 (São Paulo)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude">Longitude</Label>
            <Input
              id="longitude"
              type="text"
              placeholder="-46.6333"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Ex: -46.6333 (São Paulo)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cityName">Nome da Cidade (Opcional)</Label>
          <Input
            id="cityName"
            type="text"
            placeholder="São Paulo"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Será exibido junto com a informação do clima
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Localização"
          )}
        </Button>

        <div className="pt-4 border-t">
          <p className="text-sm font-medium mb-2">Dica:</p>
          <p className="text-xs text-muted-foreground">
            Para encontrar as coordenadas do seu hotel, você pode usar o Google Maps:
            clique com o botão direito no local e selecione as coordenadas que aparecem.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
