import { useState } from "react";
import { Star, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useGuestAuth } from "@/hooks/useGuestAuth";

interface ActivityRatingProps {
  activityId: string;
  activityName: string;
  onSuccess?: () => void;
}

const POINTS_PER_RATING = 5;

export const ActivityRating = ({ activityId, activityName, onSuccess }: ActivityRatingProps) => {
  const { guest, register, refreshGuest } = useGuestAuth();
  
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [pin, setPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Por favor, selecione uma avaliação",
        variant: "destructive",
      });
      return;
    }

    // Validations for non-logged users
    if (!guest) {
      if (!guestName.trim()) {
        toast({
          title: "Por favor, insira seu nome",
          variant: "destructive",
        });
        return;
      }

      if (!roomNumber.trim()) {
        toast({
          title: "Por favor, insira o número do apartamento",
          variant: "destructive",
        });
        return;
      }

      if (!/^\d{4}$/.test(pin)) {
        toast({
          title: "A senha deve ter exatamente 4 dígitos",
          variant: "destructive",
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let currentGuestId = guest?.id;
      let currentGuestName = guest?.name || guestName.trim();
      let currentRoomNumber = guest?.room_number || roomNumber.trim();

      // If not logged in, register the guest first
      if (!guest) {
        try {
          const newGuest = await register(guestName.trim(), roomNumber.trim(), pin);
          currentGuestId = newGuest.id;
          currentGuestName = newGuest.name;
          currentRoomNumber = newGuest.room_number;
          
          toast({
            title: "Conta criada com sucesso!",
            description: "Você ganhou 50 pontos de boas-vindas!",
          });
        } catch (registerError: any) {
          toast({
            title: "Erro ao criar conta",
            description: registerError.message,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      // Submit the rating with guest_id
      const { error } = await supabase.from("activity_ratings").insert({
        activity_id: activityId,
        rating,
        comment: comment.trim() || null,
        guest_name: currentGuestName,
        room_number: currentRoomNumber,
        guest_id: currentGuestId,
        points_earned: POINTS_PER_RATING,
      });

      if (error) {
        console.error("Error submitting rating:", error);
        toast({
          title: "Erro ao enviar avaliação",
          variant: "destructive",
        });
      } else {
        // Refresh guest data to get updated points
        await refreshGuest();
        
        toast({
          title: `Avaliação enviada! +${POINTS_PER_RATING} pontos!`,
          description: "Obrigado pelo seu feedback!",
        });
        
        // Reset form
        setRating(0);
        setComment("");
        setGuestName("");
        setRoomNumber("");
        setPin("");
        
        onSuccess?.();
      }
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro ao processar avaliação",
        variant: "destructive",
      });
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Avaliar Atividade</h3>
        <div className="flex items-center gap-1 text-sm text-primary font-medium">
          <Gift className="h-4 w-4" />
          <span>+{POINTS_PER_RATING} pts</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{activityName}</p>

      <div className="space-y-4">
        {/* Star Rating */}
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoverRating || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Guest is logged in - show readonly info */}
        {guest ? (
          <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Nome:</span>
              <span className="font-medium">{guest.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Apartamento:</span>
              <span className="font-medium">{guest.room_number}</span>
            </div>
          </div>
        ) : (
          /* Guest is NOT logged in - show registration fields */
          <>
            <Input
              placeholder="Seu nome"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
            />

            <Input
              placeholder="Número do apartamento"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              type="text"
            />

            <div className="space-y-1">
              <Input
                placeholder="Crie uma senha (4 dígitos)"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPin(value);
                }}
                type="password"
                maxLength={4}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">
                Sua senha será usada para acessar sua conta e ver seus pontos
              </p>
            </div>
          </>
        )}

        <Textarea
          placeholder="Comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            "Enviando..."
          ) : (
            <>
              <Gift className="h-4 w-4 mr-2" />
              {guest ? `Avaliar e Ganhar ${POINTS_PER_RATING} Pontos!` : `Criar Conta e Avaliar`}
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};
