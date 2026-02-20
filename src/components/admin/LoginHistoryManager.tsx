import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Monitor, Smartphone, Tablet, Globe, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoginRecord {
  id: string;
  user_email: string;
  user_role: string | null;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  created_at: string;
}

const DeviceIcon = ({ type }: { type: string | null }) => {
  switch (type) {
    case "Mobile":
      return <Smartphone className="h-4 w-4" />;
    case "Tablet":
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

export const LoginHistoryManager = () => {
  const [records, setRecords] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_login_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setRecords((data as LoginRecord[]) || []);
    } catch {
      toast.error("Erro ao carregar histórico de logins");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Histórico de Logins</h3>
        </div>
        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Navegador</TableHead>
                <TableHead>Sistema</TableHead>
                <TableHead>Data/Hora</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum login registrado ainda
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium text-sm">{record.user_email}</TableCell>
                    <TableCell>
                      <Badge variant={record.user_role === "gestor" ? "default" : "secondary"} className="text-xs">
                        {record.user_role === "gestor" ? "Gestor" : record.user_role === "recreador" ? "Recreador" : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {record.ip_address || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <DeviceIcon type={record.device_type} />
                        <span>{record.device_type || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-xs">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{record.browser || "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">{record.os || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(record.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!loading && (
          <div className="p-3 border-t text-xs text-muted-foreground text-right">
            Mostrando {records.length} registros
          </div>
        )}
      </Card>
    </div>
  );
};
