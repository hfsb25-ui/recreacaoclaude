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
  const [siteName, setSiteName] = useState("Recreação Hotel");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgeGroups();
    fetchSiteName();
  }, []);

  const fetchSiteName = async () => {
    try {
      const { data } = await supabase
        .from("site_settings")
        .select("site_name")
        .single();

      if (data?.site_name) {
        setSiteName(data.site_name);
      }
    } catch (error) {
      console.error("Error fetching site name:", error);
    }
  };

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
    <div className="min-h-screen bg-background overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-md bg-background/95 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center h-20">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full"></div>
                <div className="relative p-3 bg-gradient-to-br from-primary to-primary/80 rounded-2xl shadow-lg">
                  <Waves className="h-7 w-7 text-primary-foreground" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {siteName}
                </h1>
                <p className="text-sm text-muted-foreground">Programação do dia</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5"></div>
        <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-full mb-8 shadow-sm">
            <Sun className="h-5 w-5 text-accent-foreground" />
            <span className="font-semibold text-sm text-accent-foreground">
              Diversão para todas as idades
            </span>
          </div>
          
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-foreground tracking-tight">
            Escolha sua{" "}
            <span className="bg-gradient-to-r from-primary via-primary/90 to-secondary bg-clip-text text-transparent">
              faixa etária
            </span>
          </h2>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Selecione sua idade e descubra todas as atividades incríveis programadas para hoje
          </p>
        </div>
      </section>

      {/* Age Groups Grid */}
      <section className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          {ageGroups.length === 0 ? (
            <Card className="p-12 sm:p-16 text-center shadow-lg border-border/50 bg-card/50 backdrop-blur-sm">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <Users className="w-10 h-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-lg mb-6">
                Nenhuma faixa etária cadastrada ainda.
              </p>
              <Button
                onClick={() => navigate("/auth")}
                className="bg-gradient-to-r from-primary to-primary/90 hover:opacity-90 shadow-lg"
              >
                Cadastrar primeira faixa etária
              </Button>
            </Card>
          ) : (
            <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
              {ageGroups.map((group, index) => (
                <Card
                  key={group.id}
                  onClick={() => navigate(`/activities/${group.id}`)}
                  className="group relative p-6 sm:p-8 cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  {/* Background gradient effect */}
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      background: `radial-gradient(circle at top right, ${group.color}15, transparent 70%)`,
                    }}
                  ></div>
                  
                  {/* Icon */}
                  <div className="relative mb-6">
                    <div 
                      className="absolute inset-0 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300"
                      style={{ backgroundColor: group.color }}
                    ></div>
                    <div
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: group.color }}
                    >
                      <Users className="w-8 h-8 sm:w-10 sm:h-10" />
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative">
                    <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
                      {group.name}
                    </h3>
                    <p className="text-muted-foreground text-sm sm:text-base mb-4">
                      Veja todas as atividades programadas
                    </p>
                    
                    {/* Arrow indicator */}
                    <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span>Ver programação</span>
                      <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
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
