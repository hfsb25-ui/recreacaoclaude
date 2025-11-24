import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type Language = "pt" | "en" | "es";

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  pt: {
    "nav.home": "Início",
    "nav.schedule": "Programação",
    "nav.admin": "Admin",
    "schedule.title": "Programação do Dia",
    "schedule.noActivities": "Nenhuma atividade encontrada",
    "schedule.back": "Voltar",
    "rating.rateActivity": "Avaliar Atividade",
    "rating.selectRating": "Por favor, selecione uma avaliação",
    "rating.enterName": "Por favor, insira seu nome",
    "rating.error": "Erro ao enviar avaliação",
    "rating.success": "Avaliação enviada com sucesso!",
    "rating.yourName": "Seu nome",
    "rating.commentOptional": "Comentário (opcional)",
    "rating.submitting": "Enviando...",
    "rating.submit": "Enviar Avaliação",
    "rating.average": "Média",
    "rating.reviews": "avaliações",
    "calendar.addToCalendar": "Adicionar ao Calendário",
    "calendar.googleCalendar": "Google Calendar",
    "calendar.downloadICS": "Baixar .ics",
    "offline.mode": "Modo Offline",
    "offline.message": "Você está offline. Mostrando dados salvos.",
    "language.select": "Idioma",
  },
  en: {
    "nav.home": "Home",
    "nav.schedule": "Schedule",
    "nav.admin": "Admin",
    "schedule.title": "Today's Schedule",
    "schedule.noActivities": "No activities found",
    "schedule.back": "Back",
    "rating.rateActivity": "Rate Activity",
    "rating.selectRating": "Please select a rating",
    "rating.enterName": "Please enter your name",
    "rating.error": "Error submitting rating",
    "rating.success": "Rating submitted successfully!",
    "rating.yourName": "Your name",
    "rating.commentOptional": "Comment (optional)",
    "rating.submitting": "Submitting...",
    "rating.submit": "Submit Rating",
    "rating.average": "Average",
    "rating.reviews": "reviews",
    "calendar.addToCalendar": "Add to Calendar",
    "calendar.googleCalendar": "Google Calendar",
    "calendar.downloadICS": "Download .ics",
    "offline.mode": "Offline Mode",
    "offline.message": "You are offline. Showing saved data.",
    "language.select": "Language",
  },
  es: {
    "nav.home": "Inicio",
    "nav.schedule": "Programación",
    "nav.admin": "Admin",
    "schedule.title": "Programación del Día",
    "schedule.noActivities": "No se encontraron actividades",
    "schedule.back": "Volver",
    "rating.rateActivity": "Calificar Actividad",
    "rating.selectRating": "Por favor, seleccione una calificación",
    "rating.enterName": "Por favor, ingrese su nombre",
    "rating.error": "Error al enviar calificación",
    "rating.success": "¡Calificación enviada con éxito!",
    "rating.yourName": "Su nombre",
    "rating.commentOptional": "Comentario (opcional)",
    "rating.submitting": "Enviando...",
    "rating.submit": "Enviar Calificación",
    "rating.average": "Promedio",
    "rating.reviews": "reseñas",
    "calendar.addToCalendar": "Añadir al Calendario",
    "calendar.googleCalendar": "Google Calendar",
    "calendar.downloadICS": "Descargar .ics",
    "offline.mode": "Modo Sin Conexión",
    "offline.message": "Está sin conexión. Mostrando datos guardados.",
    "language.select": "Idioma",
  },
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("language");
    return (saved as Language) || "pt";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.pt] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
};
