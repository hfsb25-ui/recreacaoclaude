import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Download, FileText, Table } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

interface ExportData {
  participationRate: number;
  avgCheckinsPerGuest: number;
  ratingRate: number;
  satisfactionScore: number;
  retentionRate: number;
  totalActiveGuests: number;
  nps: number;
  conversionRate: number;
  periodLabel: string;
}

interface KPIExportProps {
  data: ExportData;
  logoUrl?: string;
  siteName?: string;
}

export const KPIExport = ({ data, logoUrl, siteName = "Hotel" }: KPIExportProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState({
    kpis: true,
    trends: true,
    activities: true,
    ageGroups: true
  });

  const toggleSection = (section: keyof typeof selectedSections) => {
    setSelectedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const exportPDF = async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Relatório de KPIs - ${siteName}`, pageWidth / 2, yPos, { align: "center" });
    
    yPos += 10;
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Período: ${data.periodLabel}`, pageWidth / 2, yPos, { align: "center" });
    
    yPos += 5;
    pdf.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, yPos, { align: "center" });

    yPos += 15;

    // KPIs Section
    if (selectedSections.kpis) {
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Métricas Principais", 20, yPos);
      yPos += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");

      const kpis = [
        { label: "Taxa de Participação", value: `${data.participationRate.toFixed(1)}%` },
        { label: "Média de Check-ins/Hóspede", value: data.avgCheckinsPerGuest.toFixed(1) },
        { label: "Taxa de Avaliação", value: `${data.ratingRate.toFixed(1)}%` },
        { label: "Score de Satisfação", value: data.satisfactionScore.toFixed(2) },
        { label: "Taxa de Retenção", value: `${data.retentionRate.toFixed(1)}%` },
        { label: "Hóspedes Ativos", value: data.totalActiveGuests.toString() },
        { label: "NPS Estimado", value: data.nps.toFixed(0) },
        { label: "Taxa de Conversão", value: `${data.conversionRate.toFixed(1)}%` }
      ];

      kpis.forEach((kpi, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 20 + col * 90;
        const y = yPos + row * 8;
        
        pdf.setFont("helvetica", "bold");
        pdf.text(`${kpi.label}:`, x, y);
        pdf.setFont("helvetica", "normal");
        pdf.text(kpi.value, x + 60, y);
      });

      yPos += Math.ceil(kpis.length / 2) * 8 + 15;
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128);
    pdf.text(
      "Relatório gerado automaticamente pelo sistema de KPIs",
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );

    pdf.save(`relatorio-kpis-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setIsOpen(false);
  };

  const exportCSV = () => {
    const headers = [
      "Métrica",
      "Valor"
    ];

    const rows = [
      ["Taxa de Participação", `${data.participationRate.toFixed(1)}%`],
      ["Média de Check-ins/Hóspede", data.avgCheckinsPerGuest.toFixed(1)],
      ["Taxa de Avaliação", `${data.ratingRate.toFixed(1)}%`],
      ["Score de Satisfação", data.satisfactionScore.toFixed(2)],
      ["Taxa de Retenção", `${data.retentionRate.toFixed(1)}%`],
      ["Hóspedes Ativos", data.totalActiveGuests.toString()],
      ["NPS Estimado", data.nps.toFixed(0)],
      ["Taxa de Conversão", `${data.conversionRate.toFixed(1)}%`],
      ["Período", data.periodLabel],
      ["Data de Geração", format(new Date(), "dd/MM/yyyy HH:mm")]
    ];

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `kpis-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Exportar Relatório de KPIs</DialogTitle>
          <DialogDescription>
            Escolha o formato e as seções que deseja incluir no relatório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Seções a incluir:</p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="kpis"
                  checked={selectedSections.kpis}
                  onCheckedChange={() => toggleSection("kpis")}
                />
                <label htmlFor="kpis" className="text-sm">Métricas Principais</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="trends"
                  checked={selectedSections.trends}
                  onCheckedChange={() => toggleSection("trends")}
                />
                <label htmlFor="trends" className="text-sm">Tendências</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="activities"
                  checked={selectedSections.activities}
                  onCheckedChange={() => toggleSection("activities")}
                />
                <label htmlFor="activities" className="text-sm">Análise de Atividades</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="ageGroups"
                  checked={selectedSections.ageGroups}
                  onCheckedChange={() => toggleSection("ageGroups")}
                />
                <label htmlFor="ageGroups" className="text-sm">Métricas por Faixa Etária</label>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={exportPDF} className="flex-1">
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button onClick={exportCSV} variant="outline" className="flex-1">
              <Table className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
