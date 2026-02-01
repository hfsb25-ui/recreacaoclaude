import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Clock, Star, CheckCircle, Lightbulb } from "lucide-react";

interface Alert {
  type: "warning" | "critical" | "info";
  title: string;
  message: string;
  icon: typeof AlertTriangle;
  suggestion?: string;
}

interface KPIAlertsProps {
  participationDrop: number;
  lowRatedActivities: { name: string; rating: number }[];
  hoursWithoutCheckin: number;
  isOperatingHours: boolean;
}

export const KPIAlerts = ({
  participationDrop,
  lowRatedActivities,
  hoursWithoutCheckin,
  isOperatingHours
}: KPIAlertsProps) => {
  const alerts: Alert[] = [];

  // Participation drop alert
  if (participationDrop > 20) {
    alerts.push({
      type: "critical",
      title: "Queda Crítica na Participação",
      message: `Taxa de participação caiu ${participationDrop.toFixed(0)}% em relação ao período anterior`,
      icon: TrendingDown,
      suggestion: "Considere criar atividades especiais ou aumentar a divulgação para reconquistar os hóspedes."
    });
  } else if (participationDrop > 10) {
    alerts.push({
      type: "warning",
      title: "Participação em Queda",
      message: `Taxa de participação diminuiu ${participationDrop.toFixed(0)}% vs período anterior`,
      icon: TrendingDown,
      suggestion: "Revise o horário das atividades e verifique se estão alinhadas com a disponibilidade dos hóspedes."
    });
  }

  // Low rated activities alert - Critical (< 3)
  const criticalActivities = lowRatedActivities.filter(a => a.rating < 3);
  const warningActivities = lowRatedActivities.filter(a => a.rating >= 3 && a.rating < 3.5);

  if (criticalActivities.length > 0) {
    alerts.push({
      type: "critical",
      title: `${criticalActivities.length} Atividade(s) com Avaliação Crítica`,
      message: criticalActivities.map(a => `"${a.name}" (${a.rating.toFixed(1)}★)`).join(", "),
      icon: Star,
      suggestion: "Reavalie a metodologia, equipe ou horário dessas atividades. Considere substituí-las temporariamente."
    });
  }

  if (warningActivities.length > 0) {
    alerts.push({
      type: "warning",
      title: `${warningActivities.length} Atividade(s) com Avaliação Baixa`,
      message: warningActivities.map(a => `"${a.name}" (${a.rating.toFixed(1)}★)`).join(", "),
      icon: Star,
      suggestion: "Colete feedback detalhado dos hóspedes para entender os pontos de melhoria."
    });
  }

  // No checkins during operating hours
  if (isOperatingHours && hoursWithoutCheckin >= 2) {
    alerts.push({
      type: "warning",
      title: "Inatividade Detectada",
      message: `Nenhum check-in nas últimas ${hoursWithoutCheckin} horas durante horário de operação`,
      icon: Clock,
      suggestion: "Verifique se há atividades programadas no momento e se a equipe está incentivando os check-ins."
    });
  }

  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200";
      case "info":
        return "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
    }
  };

  const getIconColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return "text-red-500";
      case "warning":
        return "text-amber-500";
      case "info":
        return "text-blue-500";
    }
  };

  const getPriorityBadge = (type: Alert["type"]) => {
    switch (type) {
      case "critical":
        return <span className="text-xs bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full">Crítico</span>;
      case "warning":
        return <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded-full">Atenção</span>;
      case "info":
        return <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">Info</span>;
    }
  };

  if (alerts.length === 0) {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-green-500" />
          <div>
            <h3 className="font-semibold text-green-800 dark:text-green-200">Tudo em Ordem!</h3>
            <p className="text-sm text-green-600 dark:text-green-400">
              Não há alertas no momento. Todas as métricas estão dentro do esperado.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Sort by priority: critical first, then warning, then info
  const sortedAlerts = [...alerts].sort((a, b) => {
    const priority = { critical: 0, warning: 1, info: 2 };
    return priority[a.type] - priority[b.type];
  });

  const criticalCount = alerts.filter(a => a.type === "critical").length;
  const warningCount = alerts.filter(a => a.type === "warning").length;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Alertas e Insights</h3>
        <div className="ml-auto flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-1 rounded-full">
              {criticalCount} crítico{criticalCount > 1 ? "s" : ""}
            </span>
          )}
          {warningCount > 0 && (
            <span className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
              {warningCount} atenção
            </span>
          )}
        </div>
      </div>
      
      <div className="space-y-3">
        {sortedAlerts.map((alert, index) => (
          <div 
            key={index}
            className={`p-3 rounded-lg border ${getAlertStyles(alert.type)}`}
          >
            <div className="flex items-start gap-3">
              <alert.icon className={`h-5 w-5 shrink-0 mt-0.5 ${getIconColor(alert.type)}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium">{alert.title}</p>
                  {getPriorityBadge(alert.type)}
                </div>
                <p className="text-sm opacity-80">{alert.message}</p>
                {alert.suggestion && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-current/10">
                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 opacity-70" />
                    <p className="text-xs opacity-70">{alert.suggestion}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
