import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface HeatmapData {
  day: number; // 0-6 (Sun-Sat)
  hour: number; // 0-23
  value: number;
}

interface ActivityHeatmapProps {
  data: HeatmapData[];
  maxValue: number;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 - 22:00

const getColorIntensity = (value: number, maxValue: number): string => {
  if (value === 0) return "bg-muted";
  const intensity = Math.ceil((value / maxValue) * 5);
  const colors: Record<number, string> = {
    1: "bg-primary/20",
    2: "bg-primary/40",
    3: "bg-primary/60",
    4: "bg-primary/80",
    5: "bg-primary"
  };
  return colors[intensity] || "bg-primary";
};

export const ActivityHeatmap = ({ data, maxValue }: ActivityHeatmapProps) => {
  const getValueForCell = (day: number, hour: number): number => {
    const cell = data.find(d => d.day === day && d.hour === hour);
    return cell?.value || 0;
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Heatmap de Acessos por Horário</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Intensidade de acessos ao site por dia da semana e hora
      </p>
      
      <div className="overflow-x-auto">
        <TooltipProvider>
          <div className="min-w-[600px]">
            {/* Header row with hours */}
            <div className="flex mb-2">
              <div className="w-12 shrink-0" />
              {HOURS.map(hour => (
                <div key={hour} className="flex-1 text-center text-xs text-muted-foreground">
                  {hour}h
                </div>
              ))}
            </div>
            
            {/* Data rows */}
            {DAYS.map((day, dayIndex) => (
              <div key={day} className="flex mb-1">
                <div className="w-12 shrink-0 text-xs text-muted-foreground flex items-center">
                  {day}
                </div>
                {HOURS.map(hour => {
                  const value = getValueForCell(dayIndex, hour);
                  return (
                    <Tooltip key={`${dayIndex}-${hour}`}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 h-8 mx-0.5 rounded-sm cursor-pointer transition-colors ${getColorIntensity(value, maxValue)}`}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{day} às {hour}:00</p>
                        <p className="text-sm">{value} acessos</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
            
            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Menos</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <div className="w-4 h-4 rounded-sm bg-primary/20" />
                <div className="w-4 h-4 rounded-sm bg-primary/40" />
                <div className="w-4 h-4 rounded-sm bg-primary/60" />
                <div className="w-4 h-4 rounded-sm bg-primary/80" />
                <div className="w-4 h-4 rounded-sm bg-primary" />
              </div>
              <span className="text-xs text-muted-foreground">Mais</span>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </Card>
  );
};
