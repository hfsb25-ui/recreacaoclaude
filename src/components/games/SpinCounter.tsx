import { Ticket } from "lucide-react";
import { Card } from "@/components/ui/card";

interface SpinCounterProps {
  count: number;
}

export const SpinCounter = ({ count }: SpinCounterProps) => {
  return (
    <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-full">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Giros Disponíveis</p>
            <p className="text-2xl font-bold text-foreground">{count}</p>
          </div>
        </div>
        {count > 0 && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Use seus giros</p>
            <p className="text-xs text-muted-foreground">e ganhe prêmios!</p>
          </div>
        )}
      </div>
    </Card>
  );
};
