import { useState } from "react";
import { useCreateScore } from "@/hooks/use-scores";
import { Loader2 } from "lucide-react";

interface ScoreFormDialogProps {
  score: number;
  onSubmitted: () => void;
  onRetry: () => void;
  accountName?: string;
  isVictory?: boolean;
  retryLabel?: string;
}

export function ScoreFormDialog({
  score,
  onSubmitted,
  onRetry,
  accountName,
  isVictory = false,
  retryLabel
}: ScoreFormDialogProps) {
  const [playerName, setPlayerName] = useState("");
  const createScore = useCreateScore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || createScore.isPending) return;

    try {
      await createScore.mutateAsync({
        playerName: (accountName || playerName.trim()).toUpperCase(),
        score,
      });
      onSubmitted();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="game-over-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="game-over-zoom bg-card box-glow-primary border border-primary p-8 rounded-2xl max-w-md w-full text-center relative overflow-hidden">
        {/* Decorative Grid inside dialog */}
        <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
        
        <h2 className={`${isVictory ? "text-xl text-cyan-300" : "text-4xl text-destructive"} text-glow-primary font-display mb-4 relative z-10`}>
          {isVictory ? "¡CAMPAÑA COMPLETADA!" : "GAME OVER"}
        </h2>
        
        <div className="mb-8 relative z-10">
          <p className="text-muted-foreground text-sm uppercase tracking-widest mb-1">Final Score</p>
          <p className="text-5xl font-display text-accent text-glow-secondary">{score}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {accountName ? (
            <p className="text-sm text-muted-foreground">Puntuación para <span className="font-bold text-cyan-200">{accountName}</span></p>
          ) : (
            <div className="space-y-2 text-left">
              <label htmlFor="playerName" className="text-xs uppercase tracking-widest text-primary font-semibold">
                Enter Initials
              </label>
              <input
                id="playerName"
                type="text"
                maxLength={10}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                placeholder="GUEST"
                required
                className="w-full bg-input border-2 border-primary/50 text-foreground font-display text-lg py-4 px-4 rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all text-center uppercase"
              />
            </div>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={createScore.isPending || (!accountName && !playerName.trim())}
              className="w-full py-4 bg-primary text-primary-foreground font-display text-sm rounded-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex justify-center items-center gap-3 box-glow-primary"
            >
              {createScore.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : accountName ? "SAVE TO MY RANKING" : "SUBMIT SCORE"}
            </button>
            
            <button
              type="button"
              onClick={onRetry}
              disabled={createScore.isPending}
              className="w-full py-4 bg-transparent border-2 border-secondary text-secondary font-display text-sm rounded-xl hover:bg-secondary/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none box-glow-secondary"
            >
              {retryLabel ?? "TRY AGAIN"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
