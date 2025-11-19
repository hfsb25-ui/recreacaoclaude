import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Sun, Waves, Users } from "lucide-react";

interface AgeGroup {
  id: string;
  name: string;
  color: string;
  sort_order: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [ageGroups, setAgeGroups] = useState<AgeGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgeGroups();
  }, []);

  const fetchAgeGroups = async () => {
    try {
      const { data } = await supabase
        .from("age_groups")
        .select("*")
        .order("sort_order", { ascending: true });

      if (data) setAgeGroups(data);
    } catch (error) {
      console.error("Error fetching age groups:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-foreground text-lg">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-bg)]">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--gradient-tropical)] rounded-xl">
              <Waves className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-[var(--gradient-tropical)] bg-clip-text text-transparent">
                Recreação Hotel
              </h1>
              <p className="text-muted-foreground text-sm">Programação do dia</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/auth")}
            className="hover:bg-primary/10 transition-[var(--transition-smooth)]"
          >
            <Settings className="mr-2 h-4 w-4" />
            Admin
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-accent/20 rounded-full mb-6">
            <Sun className="h-5 w-5 text-accent-foreground" />
            <span className="font-medium text-accent-foreground">
              Diversão para todas as idades!
            </span>
          </div>
          <h2 className="text-5xl font-bold mb-4 bg-[var(--gradient-tropical)] bg-clip-text text-transparent">
            Escolha sua faixa etária
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Clique na sua idade para ver todas as atividades de recreação programadas para hoje
          </p>
        </div>
      </section>

      {/* Age Groups Grid */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {ageGroups.length === 0 ? (
            <Card className="p-12 text-center shadow-[var(--shadow-soft)]">
              <p className="text-muted-foreground text-lg">
                Nenhuma faixa etária cadastrada ainda.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-4 bg-[var(--gradient-tropical)] hover:opacity-90"
              >
                Cadastrar primeira faixa etária
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {ageGroups.map((group) => (
                <Card
                  key={group.id}
                  onClick={() => navigate(`/activities/${group.id}`)}
                  className="p-8 cursor-pointer hover:shadow-[var(--shadow-hover)] hover:scale-105 transition-[var(--transition-smooth)] group"
                  style={{
                    background: `linear-gradient(135deg, ${group.color}15, ${group.color}05)`,
                    borderColor: group.color + "40",
                  }}
                >
                  <div
                    className="w-20 h-20 rounded-2xl mb-4 flex items-center justify-center text-white shadow-lg"
                    style={{ backgroundColor: group.color }}
                  >
                    <Users className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {group.name}
                  </h3>
                  <p className="text-muted-foreground">
                    Clique para ver as atividades
                  </p>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
