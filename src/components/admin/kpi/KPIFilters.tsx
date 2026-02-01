import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, RefreshCw, Filter } from "lucide-react";
import { format, subDays, startOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface FilterState {
  dateRange: DateRange;
  ageGroupId: string | null;
  preset: string;
}

interface AgeGroup {
  id: string;
  name: string;
  color: string;
}

interface KPIFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  ageGroups: AgeGroup[];
  onRefresh: () => void;
  lastUpdated: Date | null;
  isLoading: boolean;
}

const PRESETS = [
  { value: "today", label: "Hoje" },
  { value: "7days", label: "Últimos 7 dias" },
  { value: "30days", label: "Últimos 30 dias" },
  { value: "thisMonth", label: "Este mês" },
  { value: "thisWeek", label: "Esta semana" },
  { value: "custom", label: "Personalizado" },
];

export const KPIFilters = ({
  filters,
  onFiltersChange,
  ageGroups,
  onRefresh,
  lastUpdated,
  isLoading
}: KPIFiltersProps) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (preset: string) => {
    const now = new Date();
    let from: Date;
    let to: Date = now;

    switch (preset) {
      case "today":
        from = new Date(now.setHours(0, 0, 0, 0));
        to = new Date();
        break;
      case "7days":
        from = subDays(now, 7);
        break;
      case "30days":
        from = subDays(now, 30);
        break;
      case "thisMonth":
        from = startOfMonth(now);
        break;
      case "thisWeek":
        from = startOfWeek(now, { weekStartsOn: 0 });
        to = endOfWeek(now, { weekStartsOn: 0 });
        break;
      case "custom":
        return onFiltersChange({ ...filters, preset });
      default:
        from = subDays(now, 7);
    }

    onFiltersChange({
      ...filters,
      dateRange: { from, to },
      preset
    });
  };

  const handleDateRangeChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from) {
      onFiltersChange({
        ...filters,
        dateRange: {
          from: range.from,
          to: range.to || range.from
        },
        preset: "custom"
      });
    }
  };

  const handleAgeGroupChange = (value: string) => {
    onFiltersChange({
      ...filters,
      ageGroupId: value === "all" ? null : value
    });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtros:</span>
          </div>

          {/* Period Preset Select */}
          <Select value={filters.preset} onValueChange={handlePresetChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Selecione período" />
            </SelectTrigger>
            <SelectContent>
              {PRESETS.map(preset => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Date Range Picker */}
          {filters.preset === "custom" && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !filters.dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filters.dateRange.from ? (
                    filters.dateRange.to ? (
                      <>
                        {format(filters.dateRange.from, "dd/MM/yy", { locale: ptBR })} -{" "}
                        {format(filters.dateRange.to, "dd/MM/yy", { locale: ptBR })}
                      </>
                    ) : (
                      format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                    )
                  ) : (
                    <span>Selecione datas</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={filters.dateRange.from}
                  selected={{
                    from: filters.dateRange.from,
                    to: filters.dateRange.to
                  }}
                  onSelect={handleDateRangeChange}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Age Group Filter */}
          <Select 
            value={filters.ageGroupId || "all"} 
            onValueChange={handleAgeGroupChange}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Faixa etária" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as faixas</SelectItem>
              {ageGroups.map(ag => (
                <SelectItem key={ag.id} value={ag.id}>
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: ag.color }}
                    />
                    {ag.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Refresh Button and Last Updated */}
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {format(lastUpdated, "HH:mm", { locale: ptBR })}
            </span>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>
    </Card>
  );
};
