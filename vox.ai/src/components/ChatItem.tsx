import React from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from "motion/react";
import { User, Sparkles, Image as ImageIcon, Download, Video as VideoIcon, Play, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ChatItemProps {
  role: "user" | "model";
  content: string;
  thinking?: boolean;
  duration?: number;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export const ChatItem = ({ role, content, thinking, duration, mediaUrl, mediaType }: ChatItemProps) => {
  const isAI = role === "model";
  
  // Tag detection
  const imageMatch = content.match(/\[GENERATE_IMAGE:\s*(.*?)\]/);
  
  const displayContent = content
    .replace(/\[GENERATE_IMAGE:.*?\]/g, "")
    .replace(/<ARTIFACT[\s\S]*?<\/ARTIFACT>/g, "")
    .replace(/\[CANVAS_START\][\s\S]*?\[CANVAS_END\]/g, "")
    .replace(/<THOUGHTS>[\s\S]*?<\/THOUGHTS>/g, "")
    .trim();
  
  const hasArtifact = /<ARTIFACT[\s\S]*?<\/ARTIFACT>/.test(content) || /\[CANVAS_START\][\s\S]*?\[CANVAS_END\]/.test(content);
  const thoughtMatch = content.match(/<THOUGHTS>([\s\S]*?)<\/THOUGHTS>/);
  const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : null;
  const [showThoughts, setShowThoughts] = React.useState(false);

  const imagePrompt = imageMatch ? imageMatch[1] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
      className={cn(
        "flex w-full mb-10 gap-6 group",
        isAI ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-1 transition-transform group-hover:scale-110",
        isAI ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground"
      )}>
        {isAI ? <Sparkles size={16} /> : <User size={16} />}
      </div>

      <div className={cn(
        "flex-1 max-w-[85%]",
        !isAI && "text-right flex flex-col items-end"
      )}>
        <div className={cn(
          "text-[11px] uppercase tracking-widest font-semibold mb-2 opacity-50 flex items-center justify-between",
          isAI ? "text-brand" : "text-muted-foreground text-right"
        )}>
          <span>{isAI ? "VOX-AI" : "USER"}</span>
        </div>
        
        {thinking ? (
          <div className="flex-1 space-y-3 pt-1 animate-in fade-in duration-700">
            <div className="gemini-loading-text h-4 w-1/3 opacity-80" />
            <div className="gemini-loading-text h-4 w-full opacity-60" />
            <div className="gemini-loading-text h-4 w-11/12 opacity-40" />
            <div className="gemini-loading-text h-4 w-2/3 opacity-20" />
          </div>
        ) : (
          <div className="w-full space-y-4">
            {isAI && duration && (
              <div className="mt-2 text-[10px] font-mono text-muted-foreground/50">
                Responded in {duration.toFixed(2)}s
              </div>
            )}
            
            {mediaUrl && mediaType === "image" && (
                <div className="rounded-3xl overflow-hidden border border-border shadow-2xl">
                    <img src={mediaUrl} alt="Generated" className="w-full h-auto" />
                </div>
            )}

            {thoughtContent && (
              <div className="border border-border/40 rounded-2xl overflow-hidden bg-secondary/20">
                <button 
                  onClick={() => setShowThoughts(!showThoughts)}
                  className="w-full flex items-center justify-between px-4 py-2 hover:bg-secondary/50 transition-colors"
                >
                   <div className="flex items-center gap-2">
                     <Terminal size={12} className="text-muted-foreground" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Neural Processing Trace</span>
                   </div>
                   <div className="flex items-center gap-2">
                     <span className="text-[9px] font-mono text-brand opacity-60">
                       {showThoughts ? "[ COLLAPSE ]" : "[ EXPAND LOGS ]"}
                     </span>
                   </div>
                </button>
                <AnimatePresence>
                  {showThoughts && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/20"
                    >
                      <div className="p-4 pt-2 text-[11px] font-mono leading-relaxed text-muted-foreground/80 bg-black/20 italic whitespace-pre-wrap">
                        {thoughtContent}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {displayContent && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "prose prose-sm leading-relaxed",
                  !isAI && "bg-secondary/50 px-6 py-4 rounded-2xl inline-block text-left border border-border/30 shadow-sm"
                )}
              >
                <ReactMarkdown>{displayContent}</ReactMarkdown>
              </motion.div>
            )}

            {hasArtifact && (
              <div className="flex items-center gap-3 p-3 bg-brand/5 border border-brand/20 rounded-2xl w-fit group/art transition-all hover:bg-brand/10 hover:border-brand/40">
                <div className="p-2 bg-brand/10 rounded-xl text-brand group-hover/art:scale-110 transition-transform">
                  <Sparkles size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-brand">Apex Asset Rendered</span>
                  <span className="text-[9px] text-muted-foreground font-mono lowercase italic leading-none mt-0.5">Specifications successfully exported to canvas</span>
                </div>
              </div>
            )}

            {imagePrompt && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-3xl overflow-hidden border border-border shadow-2xl bg-black/40 group relative"
              >
                <img 
                  src={`https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=800&height=600&model=flux&nologo=true`} 
                  alt={imagePrompt}
                  className="w-full h-auto aspect-[4/3] object-cover group-hover:scale-105 transition-transform duration-1000"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase font-bold text-brand tracking-widest flex items-center gap-2 animate-pulse">
                        <ImageIcon size={10} /> Neural Synthesis Successful
                      </p>
                      <p className="text-xs text-white/80 italic font-mono line-clamp-2">{imagePrompt}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all transform hover:scale-110">
                      <Download size={16} />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-secondary/80 backdrop-blur-md flex items-center justify-between border-t border-white/5">
                  <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">Resolution: 3840x2160 // Quantum-Upscaled</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand/10" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
