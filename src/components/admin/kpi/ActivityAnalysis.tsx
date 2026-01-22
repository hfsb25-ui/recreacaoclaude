import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface ActivityStats {
  id: string;
  name: string;
  totalCheckins: number;
  totalRatings: number;
  avgRating: number;
  ratingRate: number; // % who rated after check-in
  ageGroup: string;
  ageGroupColor: string;
}

interface ActivityAnalysisProps {
  activities: ActivityStats[];
  topActivities: ActivityStats[];
  underperformingActivities: ActivityStats[];
}

const getRatingBadge = (rating: number) => {
  if (rating >= 4.5) return { variant: "default" as const, text: "Excelente", color: "bg-green-500" };
  if (rating >= 4.0) return { variant: "default" as const, text: "Ótimo", color: "bg-blue-500" };
  if (rating >= 3.5) return { variant: "secondary" as const, text: "Bom", color: "bg-yellow-500" };
  if (rating >= 3.0) return { variant: "secondary" as const, text: "Regular", color: "bg-orange-500" };
  return { variant: "destructive" as const, text: "Baixo", color: "bg-red-500" };
};

export const ActivityAnalysis = ({ 
  activities, 
  topActivities, 
  underperformingActivities 
}: ActivityAnalysisProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Top Performing Activities */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-green-500" />
          <h3 className="text-lg font-semibold">Top 5 Atividades</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Maior engajamento (check-ins + avaliações)
        </p>
        
        <div className="space-y-3">
          {topActivities.slice(0, 5).map((activity, index) => (
            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{activity.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: activity.ageGroupColor }}
                  />
                  <span>{activity.ageGroup}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{activity.avgRating.toFixed(1)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {activity.totalCheckins} check-ins
                </p>
              </div>
            </div>
          ))}
          
          {topActivities.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhuma atividade com dados suficientes
            </p>
          )}
        </div>
      </Card>

      {/* Underperforming Activities */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">Atenção Necessária</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Atividades com baixa participação ou avaliação
        </p>
        
        <div className="space-y-3">
          {underperformingActivities.slice(0, 5).map((activity) => {
            const ratingBadge = getRatingBadge(activity.avgRating);
            return (
              <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                <TrendingDown className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{activity.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{activity.ageGroup}</span>
                    <span>•</span>
                    <span>{activity.totalCheckins} check-ins</span>
                  </div>
                </div>
                <div className="text-right">
                  {activity.avgRating > 0 ? (
                    <Badge className={ratingBadge.color}>
                      {activity.avgRating.toFixed(1)} ★
                    </Badge>
                  ) : (
                    <Badge variant="outline">Sem avaliações</Badge>
                  )}
                </div>
              </div>
            );
          })}
          
          {underperformingActivities.length === 0 && (
            <p className="text-green-600 text-sm text-center py-4">
              ✓ Todas as atividades estão performando bem!
            </p>
          )}
        </div>
      </Card>

      {/* All Activities Table */}
      <Card className="p-4 lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Análise Detalhada de Atividades</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium">Atividade</th>
                <th className="text-left py-2 font-medium">Faixa Etária</th>
                <th className="text-right py-2 font-medium">Check-ins</th>
                <th className="text-right py-2 font-medium">Avaliações</th>
                <th className="text-right py-2 font-medium">Taxa Avaliação</th>
                <th className="text-right py-2 font-medium">Média</th>
              </tr>
            </thead>
            <tbody>
              {activities.slice(0, 15).map(activity => {
                const ratingBadge = getRatingBadge(activity.avgRating);
                return (
                  <tr key={activity.id} className="border-b border-muted hover:bg-muted/50">
                    <td className="py-2 font-medium">{activity.name}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full" 
                          style={{ backgroundColor: activity.ageGroupColor }}
                        />
                        <span className="text-muted-foreground">{activity.ageGroup}</span>
                      </div>
                    </td>
                    <td className="text-right py-2">{activity.totalCheckins}</td>
                    <td className="text-right py-2">{activity.totalRatings}</td>
                    <td className="text-right py-2">
                      <span className={activity.ratingRate < 30 ? "text-amber-500" : ""}>
                        {activity.ratingRate.toFixed(0)}%
                      </span>
                    </td>
                    <td className="text-right py-2">
                      {activity.avgRating > 0 ? (
                        <Badge className={ratingBadge.color} variant="secondary">
                          {activity.avgRating.toFixed(1)} ★
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
