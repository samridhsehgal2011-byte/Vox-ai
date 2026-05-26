import { useState, useRef, useEffect } from "react";
import { ArrowUp, Plus, Terminal, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  isCameraOn: boolean;
  setIsCameraOn: (on: boolean) => void;
}

export const ChatInput = ({ onSend, isLoading, isCameraOn, setIsCameraOn }: ChatInputProps) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="chat-input-capsule flex items-end p-2 sm:p-3 relative group">
        <Button
          size="icon"
          variant="ghost"
          className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground hover:bg-white/10 shrink-0"
        >
          <Plus size={20} />
        </Button>
        
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Ask AL13N-LLM anything..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-foreground placeholder:text-muted-foreground/60 py-2.5 px-3 resize-none max-h-[200px] text-sm md:text-base leading-relaxed"
          rows={1}
        />

        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsCameraOn(!isCameraOn)}
            className={cn("rounded-full w-10 h-10 transition-colors", isCameraOn ? "text-brand" : "text-muted-foreground")}
          >
            <Camera size={18} />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            className="rounded-full w-10 h-10 text-muted-foreground hover:text-brand hover:bg-brand/10 transition-colors"
          >
            <Terminal size={18} />
          </Button>
          
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className={cn(
              "rounded-full w-10 h-10 transition-all duration-300",
              input.trim() && !isLoading
                ? "bg-brand text-white scale-100 shadow-lg shadow-brand/20 hover:scale-105" 
                : "bg-muted text-muted-foreground/40 scale-95"
            )}
          >
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                >
                  <ArrowUp size={18} />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <ArrowUp size={18} />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </div>
      
      <div className="mt-3 px-6 flex justify-between items-center text-[10px] text-muted-foreground/50 font-medium uppercase tracking-widest">
        <div className="flex gap-4">
          <span className="hover:text-muted-foreground transition-colors cursor-default">AL13N-LLM</span>
          <span className="hover:text-muted-foreground transition-colors cursor-default">Privacy Mode</span>
        </div>
        <span>{input.length} characters</span>
      </div>
    </div>
  );
};
