import { Card } from "@/components/ui/card";
import { Lightbulb, TrendingUp, TrendingDown, Clock, Users, Star, Calendar } from "lucide-react";

export interface Insight {
  id: string;
  type: "positive" | "negative" | "neutral";
  category: "activity" | "time" | "engagement" | "audience";
  title: string;
  description: string;
  metric?: string;
}

interface SmartInsightsProps {
  insights: Insight[];
}

const getCategoryIcon = (category: Insight["category"]) => {
  switch (category) {
    case "activity":
      return Star;
    case "time":
      return Clock;
    case "engagement":
      return TrendingUp;
    case "audience":
      return Users;
    default:
      return Lightbulb;
  }
};

const getTypeStyles = (type: Insight["type"]) => {
  switch (type) {
    case "positive":
      return {
        bg: "bg-green-50 dark:bg-green-950/20",
        border: "border-green-200 dark:border-green-800",
        icon: "text-green-500",
        title: "text-green-700 dark:text-green-300"
      };
    case "negative":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        border: "border-amber-200 dark:border-amber-800",
        icon: "text-amber-500",
        title: "text-amber-700 dark:text-amber-300"
      };
    default:
      return {
        bg: "bg-blue-50 dark:bg-blue-950/20",
        border: "border-blue-200 dark:border-blue-800",
        icon: "text-blue-500",
        title: "text-blue-700 dark:text-blue-300"
      };
  }
};

export const SmartInsights = ({ insights }: SmartInsightsProps) => {
  if (insights.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Insights Inteligentes</h3>
        </div>
        <p className="text-muted-foreground text-sm text-center py-8">
          Colete mais dados para gerar insights automáticos.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <h3 className="text-lg font-semibold">Insights Inteligentes</h3>
        <span className="ml-auto text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full">
          {insights.length} {insights.length === 1 ? "insight" : "insights"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map(insight => {
          const Icon = getCategoryIcon(insight.category);
          const styles = getTypeStyles(insight.type);
          
          return (
            <div
              key={insight.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${styles.bg} ${styles.border}`}
            >
              <div className={`p-2 rounded-lg bg-background/50`}>
                <Icon className={`h-4 w-4 ${styles.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${styles.title}`}>
                  {insight.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {insight.description}
                </p>
                {insight.metric && (
                  <p className="text-xs font-medium mt-2 opacity-75">
                    {insight.metric}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
