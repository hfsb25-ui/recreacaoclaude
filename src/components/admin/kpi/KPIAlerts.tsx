import { Card } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Clock, Star, CheckCircle } from "lucide-react";

interface Alert {
  type: "warning" | "critical" | "info";
  title: string;
  message: string;
  icon: typeof AlertTriangle;
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
      title: "Queda na Participação",
      message: `Taxa de participação caiu ${participationDrop.toFixed(0)}% em relação ao período anterior`,
      icon: TrendingDown
    });
  } else if (participationDrop > 10) {
    alerts.push({
      type: "warning",
      title: "Participação em Queda",
      message: `Taxa de participação diminuiu ${participationDrop.toFixed(0)}% vs período anterior`,
      icon: TrendingDown
    });
  }

  // Low rated activities alert
  lowRatedActivities.forEach(activity => {
    if (activity.rating < 3) {
      alerts.push({
        type: "critical",
        title: "Avaliação Crítica",
        message: `"${activity.name}" está com média de ${activity.rating.toFixed(1)} estrelas`,
        icon: Star
      });
    } else if (activity.rating < 3.5) {
      alerts.push({
        type: "warning",
        title: "Avaliação Baixa",
        message: `"${activity.name}" está com média de ${activity.rating.toFixed(1)} estrelas`,
        icon: Star
      });
    }
  });

  // No checkins during operating hours
  if (isOperatingHours && hoursWithoutCheckin >= 2) {
    alerts.push({
      type: "warning",
      title: "Inatividade Detectada",
      message: `Nenhum check-in nas últimas ${hoursWithoutCheckin} horas durante horário de operação`,
      icon: Clock
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

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold">Alertas e Insights</h3>
        <span className="ml-auto text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
          {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
        </span>
      </div>
      
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div 
            key={index}
            className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertStyles(alert.type)}`}
          >
            <alert.icon className={`h-5 w-5 shrink-0 mt-0.5 ${getIconColor(alert.type)}`} />
            <div>
              <p className="font-medium">{alert.title}</p>
              <p className="text-sm opacity-80">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
