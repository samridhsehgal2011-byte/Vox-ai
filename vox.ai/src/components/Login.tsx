import { Button } from "@/components/ui/button";
import { AILogo } from "./AILogo";
import { signInWithGoogle } from "../lib/firebase";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";

export const Login = ({ onGuestLogin }: { onGuestLogin: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background gemini-gradient text-foreground p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center max-w-sm w-full text-center space-y-8"
      >
        <div className="relative">
          <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full" />
          <AILogo />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-black tracking-[0.2em] uppercase">AL13N <span className="text-brand">APEX CORE</span></h1>
          <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest opacity-60">High-Fidelity Neural Interface // Proxima Centauri V4</p>
        </div>

        <div className="space-y-4 w-full">
          <Button 
            onClick={signInWithGoogle} 
            size="lg" 
            className="w-full h-14 rounded-2xl bg-brand hover:bg-brand/90 text-white font-semibold text-lg shadow-xl shadow-brand/20 gap-3 group"
          >
            <LogIn className="group-hover:translate-x-1 transition-transform" size={20} />
            Sign in with Google
          </Button>

          <Button 
            onClick={onGuestLogin}
            variant="outline"
            size="lg" 
            className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-semibold text-lg gap-3 group"
          >
            Continue as Guest
          </Button>
        </div>

        <p className="text-[10px] uppercase tracking-widest text-muted-foreground/50 font-bold">
          Secure Quantum Handshake Protocol Required
        </p>
      </motion.div>
    </div>
  );
};
