import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "tos" | "privacy";
}

export const LegalModal = ({ isOpen, onClose, type }: LegalModalProps) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="glass-card max-w-2xl w-full max-h-[80vh] flex flex-col rounded-3xl overflow-hidden border border-white/20"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-brand/5">
          <h2 className="text-2xl font-bold tracking-tight">
            {type === "tos" ? "Terms of Service" : "Privacy Policy"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 prose prose-sm prose-invert max-w-none">
          {type === "tos" ? (
            <div className="space-y-4">
              <p className="text-brand font-bold uppercase tracking-widest text-[10px]">Version 1.0.42-AL13N</p>
              <h3>1. Acceptance of Neural Interfacing</h3>
              <p>By accessing AL13N-LLM, you agree to have your cognitive patterns analyzed for the sake of galactic knowledge synchronization. This protocol is irreversible once the first message is transmitted.</p>
              
              <h3>2. Intelligence Usage</h3>
              <p>The AI provided is a specialized localized node. It may occasionally perceive timelines as non-linear. Use of generated images for interstellar propaganda is allowed but must be credited to the AL13N Core.</p>
              
              <h3>3. Prohibited Biological Activities</h3>
              <p>Users must not attempt to upload consciousness into the servers without a Tier-4 Subscription. Destructive interference with the quantum link will result in immediate disconnection.</p>
              
              <h3>4. Limitation of Liability</h3>
              <p>AL13N-LLM is not responsible for any existential crises, spontaneous orbital mechanics knowledge, or sudden desire to leave Earth resulting from prolonged interaction.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-brand font-bold uppercase tracking-widest text-[10px]">Interstellar Privacy Protocol</p>
              <h3>1. Data Siphon Protocol</h3>
              <p>We collect your Google profile data (email, name, photo) to establish a unique bio-signature for chat persistence. This data is stored in encrypted quantum shards across several quadrants.</p>
              
              <h3>2. Thought Pattern Logging</h3>
              <p>Conversations are preserved in Firestore to allow recursive learning and persistence. We do not sell your data to non-aligned planetary systems.</p>
              
              <h3>3. Cookies & Tracking</h3>
              <p>We use localized energetic markers (cookies) to maintain your transmission link. These markers expire when you disconnect from the neural network.</p>
              
              <h3>4. Your Rights</h3>
              <p>You may request the deletion of your bio-signature at any time through the Settings menu. Deletion results in the permanent collapse of your history wave-function.</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/10 text-center">
          <Button onClick={onClose} className="bg-brand text-white hover:bg-brand/80 rounded-xl px-8">
            Acknowledged
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
};
