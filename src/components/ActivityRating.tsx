import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ActivityRatingProps {
  activityId: string;
  activityName: string;
}

export const ActivityRating = ({ activityId, activityName }: ActivityRatingProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [guestName, setGuestName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "Por favor, selecione uma avaliação",
        variant: "destructive",
      });
      return;
    }

    if (!guestName.trim()) {
      toast({
        title: "Por favor, insira seu nome",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.from("activity_ratings").insert({
      activity_id: activityId,
      rating,
      comment: comment.trim() || null,
      guest_name: guestName.trim(),
    });

    if (error) {
      console.error("Error submitting rating:", error);
      toast({
        title: "Erro ao enviar avaliação",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Avaliação enviada com sucesso!",
      });
      setRating(0);
      setComment("");
      setGuestName("");
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <h3 className="text-lg font-semibold">Avaliar Atividade</h3>
      <p className="text-sm text-muted-foreground">{activityName}</p>

      <div className="space-y-4">
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

        <Input
          placeholder="Seu nome"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
        />

        <Textarea
          placeholder="Comentário (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />

        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Enviando..." : "Enviar Avaliação"}
        </Button>
      </div>
    </Card>
  );
};
