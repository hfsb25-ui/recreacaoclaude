import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { WHEEL_SECTORS, type SpinResult } from "@/hooks/useGameSpins";

interface LuckyWheelProps {
  onSpin: () => Promise<SpinResult | null>;
  disabled: boolean;
  spinCount: number;
}

export const LuckyWheel = ({ onSpin, disabled, spinCount }: LuckyWheelProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const sectorAngle = 360 / WHEEL_SECTORS.length;

  const handleSpin = async () => {
    if (isSpinning || disabled) return;

    setIsSpinning(true);

    // Get result first
    const result = await onSpin();

    if (!result) {
      setIsSpinning(false);
      return;
    }

    // Find the sector index for the result
    const sectorIndex = WHEEL_SECTORS.findIndex(
      (s) =>
        s.type === result.result_type &&
        (result.result_type !== "points" || s.points === result.points_won)
    );

    // Calculate target rotation
    // The wheel needs to stop with the pointer at the correct sector
    // Pointer is at the top, so we need to rotate to position the sector there
    const baseRotations = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const sectorCenter = sectorIndex * sectorAngle + sectorAngle / 2;
    // To have sector at top, we need to rotate so that sector is at 0 degrees
    const targetRotation = baseRotations * 360 + (360 - sectorCenter);

    setRotation((prev) => prev + targetRotation);

    // Wait for animation to complete
    setTimeout(() => {
      setIsSpinning(false);
    }, 5000);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pointer */}
      <div className="relative z-10 -mb-4">
        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[24px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
      </div>

      {/* Wheel Container */}
      <div className="relative">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border-8 border-primary/30 shadow-[var(--shadow-glow)]" />

        {/* Wheel */}
        <div
          ref={wheelRef}
          className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full overflow-hidden shadow-2xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
          }}
        >
          {WHEEL_SECTORS.map((sector, index) => {
            const startAngle = index * sectorAngle;
            const endAngle = (index + 1) * sectorAngle;
            const midAngle = startAngle + sectorAngle / 2;

            // Convert to radians for text positioning
            const textRadius = 100; // Distance from center for text
            const textAngleRad = ((midAngle - 90) * Math.PI) / 180;
            const textX = 50 + textRadius * 0.35 * Math.cos(textAngleRad);
            const textY = 50 + textRadius * 0.35 * Math.sin(textAngleRad);

            return (
              <div
                key={sector.id}
                className="absolute inset-0"
                style={{
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos(((startAngle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((startAngle - 90) * Math.PI) / 180)}%, ${50 + 50 * Math.cos(((endAngle - 90) * Math.PI) / 180)}% ${50 + 50 * Math.sin(((endAngle - 90) * Math.PI) / 180)}%)`,
                  backgroundColor: sector.color,
                }}
              >
                <span
                  className="absolute text-white text-xs sm:text-sm font-bold whitespace-nowrap drop-shadow-md"
                  style={{
                    left: `${textX}%`,
                    top: `${textY}%`,
                    transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
                  }}
                >
                  {sector.label}
                </span>
              </div>
            );
          })}

          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white shadow-lg flex items-center justify-center">
            <span className="text-2xl">🎰</span>
          </div>
        </div>
      </div>

      {/* Spin Button */}
      <Button
        size="lg"
        onClick={handleSpin}
        disabled={disabled || isSpinning}
        className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg"
      >
        {isSpinning ? (
          <span className="animate-pulse">Girando...</span>
        ) : (
          <>
            🎲 GIRAR A RODA
            {spinCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-sm">
                {spinCount}
              </span>
            )}
          </>
        )}
      </Button>

      {spinCount === 0 && !isSpinning && (
        <p className="text-sm text-muted-foreground text-center">
          Faça check-in ou avalie atividades para ganhar giros!
        </p>
      )}
    </div>
  );
};
