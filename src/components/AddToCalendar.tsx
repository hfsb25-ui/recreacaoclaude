import { Calendar, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface AddToCalendarProps {
  activityName: string;
  description?: string;
  startTime: string;
  endTime: string;
  date: Date;
}

export const AddToCalendar = ({
  activityName,
  description,
  startTime,
  endTime,
  date,
}: AddToCalendarProps) => {

  const formatDateForICS = (date: Date, time: string) => {
    const [hours, minutes] = time.split(":");
    const dateTime = new Date(date);
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0);
    return format(dateTime, "yyyyMMdd'T'HHmmss");
  };

  const generateICS = () => {
    const startDateTime = formatDateForICS(date, startTime);
    const endDateTime = formatDateForICS(date, endTime);
    
    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Recreation App//Activity//EN",
      "BEGIN:VEVENT",
      `DTSTART:${startDateTime}`,
      `DTEND:${endDateTime}`,
      `SUMMARY:${activityName}`,
      `DESCRIPTION:${description || activityName}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activityName.replace(/\s+/g, "_")}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const addToGoogleCalendar = () => {
    const startDateTime = formatDateForICS(date, startTime);
    const endDateTime = formatDateForICS(date, endTime);
    
    const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      activityName
    )}&dates=${startDateTime}/${endDateTime}&details=${encodeURIComponent(
      description || activityName
    )}`;
    
    window.open(googleUrl, "_blank");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">Adicionar ao Calendário</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={addToGoogleCalendar} className="gap-2">
          <Calendar className="h-4 w-4" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateICS} className="gap-2">
          <Download className="h-4 w-4" />
          Baixar .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
