/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { jsPDF } from "jspdf";
import { motion, AnimatePresence } from "motion/react";
import { Plus as PlusIcon, Terminal, Shield, MessageSquare, History, Settings, MoreVertical, Search, PanelLeftClose, PanelLeftOpen, LogOut, Code, User, Crown, ExternalLink, Sparkles, CreditCard, X, Globe, MousePointer2, Copy, RefreshCw, Play, Download, EyeOff } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ChatItem } from "./components/ChatItem";
import { ChatInput } from "./components/ChatInput";
import { AILogo } from "./components/AILogo";
import { LegalModal } from "./components/LegalModal";
import { sendMessageStream, Message } from "./lib/gemini";
import { cn } from "@/lib/utils";
import { useAuth } from "./hooks/useAuth";
import { Login } from "./components/Login";
import { signOut } from "./lib/firebase";
import { subscribeToChats, createChat, addMessage, subscribeToMessages, Chat, ChatMessage, updateChatTitle } from "./lib/db";

export default function App() {
  const { user, loading, isAdmin, isDev } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isEphemeral, setIsEphemeral] = useState(false);
  const [messages, setMessages] = useState<(ChatMessage & { thinking?: boolean, duration?: number })[]>([]);
  const [streamedResponse, setStreamedResponse] = useState<{ content: string; thinking: boolean; duration?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [legalType, setLegalType] = useState<"tos" | "privacy" | null>(null);
  const [voice, setVoice] = useState(localStorage.getItem('alien_voice') || 'adam');
  const [activeModel, setActiveModel] = useState(localStorage.getItem('alien_model') || 'gemini-flash-latest');
  const [showSplash, setShowSplash] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
     if (navigator.geolocation) {
         navigator.geolocation.getCurrentPosition((position) => {
             setUserLocation({
                 lat: position.coords.latitude,
                 lng: position.coords.longitude
             });
             setLocationError(null);
         }, (err) => {
             console.error("Geolocation error:", err);
             setLocationError("Location access denied.");
         });
     } else {
         setLocationError("Geolocation not supported.");
     }
  }, []);

  const exportChat = (format: 'json' | 'pdf') => {
    const chatTitle = chats.find(c => c.id === currentChatId)?.title || 'chat';
    const content = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${chatTitle}.json`;
      a.click();
    } else {
      const doc = new jsPDF();
      doc.text(content, 10, 10);
      doc.save(`${chatTitle}.pdf`);
    }
  };
  
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const isProcessingQueue = useRef(false);
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [artifactData, setArtifactData] = useState<{ type: string, content: string, title: string } | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((force = false) => {
    if (!scrollAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollHeight - scrollTop <= clientHeight + 200;

    if (force || isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: force ? "smooth" : "auto" });
    }
  }, []);

  // Update artifacts when messages change (detect artifact tags)
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "model" && !lastMessage.thinking) {
      // Check for <ARTIFACT> format
      const artifactMatch = lastMessage.content.match(/<ARTIFACT\s+type="(code|markdown)"\s+title="([^"]+)">([\s\S]*?)<\/ARTIFACT>/);
      if (artifactMatch) {
        setArtifactData({
          type: artifactMatch[1],
          title: artifactMatch[2],
          content: artifactMatch[3].trim()
        });
        setShowArtifacts(true);
        return;
      }

      // Check for [CANVAS_START] format
      const canvasMatch = lastMessage.content.match(/\[CANVAS_START\]([\s\S]*?)\[CANVAS_END\]/);
      if (canvasMatch) {
        setArtifactData({
          type: "code", // Default to code for canvas blocks
          title: "Apex Design Canvas",
          content: canvasMatch[1].trim()
        });
        setShowArtifacts(true);
      }
    }
  }, [messages]);

  // 1. All Hook Declarations
  useEffect(() => {
    document.documentElement.classList.add('dark');
    const timer = setTimeout(() => setShowSplash(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    window.addEventListener('click', closeContextMenu);
    return () => window.removeEventListener('click', closeContextMenu);
  }, [closeContextMenu]);

  // Subscribe to user's chats
  useEffect(() => {
    if (user && !isGuest && user.email) {
      const unsubscribe = subscribeToChats(user.email, (loadedChats) => {
        setChats(loadedChats);
      });
      return unsubscribe;
    }
  }, [user, isGuest]);

  // Subscribe to current chat messages
  useEffect(() => {
    if (!user || !currentChatId) {
      if (!currentChatId) {
          setMessages([{ 
            role: "model", 
            content: "Operational. VOX-AI (v5.0) online. Awaiting creative directives.",
            createdAt: new Date()
          }]);
      }
      return;
    }

    const unsubscribe = subscribeToMessages(currentChatId, (loadedMessages) => {
      setMessages(loadedMessages);
    });
    return unsubscribe;
  }, [currentChatId, user]);

  useEffect(() => {
    // Only scroll when the messages list changes in length or during streaming if at bottom
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 2. Logic functions
  const generateChatTitle = (message: string) => {
    const refined = message.replace(/[^\w\s]/g, '');
    const words = refined.split(/\s+/).filter(w => w.length > 0);
    const title = words.slice(0, 4).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    return title.length === 0 ? "New Chat" : title;
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY });
  };

  const updateModel = (newModel: string) => {
    setActiveModel(newModel);
    localStorage.setItem('alien_model', newModel);
  };

  // Queue processing
  useEffect(() => {
    const processQueue = async () => {
      if (messageQueue.length > 0 && !isProcessingQueue.current) {
        isProcessingQueue.current = true;
        const nextMessage = messageQueue[0];
        setMessageQueue(prev => prev.slice(1));
        await performSend(nextMessage);
        isProcessingQueue.current = false;
      }
    };
    processQueue();
  }, [messageQueue]);

  const [queuedItems, setQueuedItems] = useState<{type: 'text' | 'image', summary: string, status: 'processing' | 'queued'}[]>([]);

  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const res = await fetch("/api/queue-status");
        if (res.ok) {
          const data = await res.json();
          setQueuedItems(data);
        }
      } catch (e) {
        console.error("Error fetching queue status:", e);
      }
    };
    const interval = setInterval(fetchQueue, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = (content: string) => {
    setMessageQueue(prev => [...prev, content]);
  };

  const performSend = async (content: string) => {
    let chatId = currentChatId;
    
    // Create new chat if none exists
    if (!isEphemeral && !chatId && user && user.email) {
      const newTitle = generateChatTitle(content);
      const newChat = await createChat(user.uid, user.email, newTitle);
      chatId = newChat.id;
      setCurrentChatId(chatId);
    }

    if (!isEphemeral && (!chatId || !user)) return;

    // Optimistic user message update
    const optimisticUserMsg: ChatMessage = { 
      role: "user", 
      content, 
      createdAt: new Date(),
      id: "temp-" + Date.now()
    };
    setMessages(prev => [...prev, optimisticUserMsg]);

    // Save user message to DB
    if (!isEphemeral) {
      await addMessage(chatId!, { role: "user", content });
    }
    setIsLoading(true);

    const startTime = performance.now();
    try {
      let fullResponse = "";
      // Initialize streaming state
      setStreamedResponse({ content: "", thinking: true });

      const lowerContent = content.toLowerCase();
      const isModelQuery = lowerContent.includes("who are you") ||
                           lowerContent.includes("what is your") ||
                           lowerContent.includes("what llm do you use") ||
                           lowerContent.includes("which llm do you use") ||
                           lowerContent.includes("which slm do you use") ||
                           lowerContent.includes("what are you");
      
      const isTimeQuery = lowerContent.includes("what time is it");

      if (isTimeQuery) {
          const response = `The current live time is: ${currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}, Date: ${currentTime.toLocaleDateString()}.`;
          if (!isEphemeral) {
              await addMessage(chatId!, { role: "model", content: response });
          } else {
             setMessages(prev => [...prev, { role: "model", content: response, createdAt: new Date() }]);
          }
          setIsLoading(false);
          return;
      }

      if (lowerContent.startsWith("generate image") || lowerContent.startsWith("draw")) {
        try {
            const response = await fetch("/api/generate-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: content.replace(/generate image|draw/gi, "").trim() }),
            });
            const data = await response.json();
            
            const message: ChatMessage = { role: "model", content: "Image generated:", mediaUrl: data.imageUrl, mediaType: "image", createdAt: new Date() };

            if (!isEphemeral) {
                await addMessage(chatId!, message);
            } else {
                setMessages(prev => [...prev, message]);
            }
        } catch (e: any) {
             const message: ChatMessage = { role: "model", content: `Error generating image: ${e.message}`, createdAt: new Date() };
             if (!isEphemeral) {
                 await addMessage(chatId!, message);
             } else {
                 setMessages(prev => [...prev, message]);
             }
        }
        setIsLoading(false);
        return;
      }

      if (isModelQuery) {
          const response = `I am VOX-LLM v3.1. My operational architecture is built upon VOX-SLM, a small language model developed by VOX-DEV, powered by Google's Gemini architecture. As an SLM (Small Language Model), I am specifically optimized for high efficiency, speed, and precise task execution. How may I assist you today?`;

          if (!isEphemeral) {
              await addMessage(chatId!, { role: "model", content: response });
          } else {
             setMessages(prev => [...prev, { role: "model", content: response, createdAt: new Date() }]);
          }
          setIsLoading(false);
          return;
      }

      const history: Message[] = messages.map(m => ({ role: m.role, parts: m.content }));
      const stream = sendMessageStream(content, history);

      let firstChunk = true;
      for await (const chunk of stream) {
        if (firstChunk) {
          setStreamedResponse(prev => prev ? { ...prev, thinking: false } : null);
          firstChunk = false;
        }

        fullResponse += chunk;
        setStreamedResponse(prev => prev ? { ...prev, content: fullResponse } : null);
      }

      const duration = (performance.now() - startTime) / 1000;
      setStreamedResponse(prev => prev ? { ...prev, duration } : null);

      // Save model response to Firestore
      if (!isEphemeral) {
        await addMessage(chatId!, { role: "model", content: fullResponse });
      } else {
        setMessages(prev => [...prev, { role: "model", content: fullResponse, createdAt: new Date() }]);
      }
      
      // Clear streamed response after a small delay to allow Firestore to catch up
      setTimeout(() => setStreamedResponse(null), 500);
      
    } catch (error) {
      console.error("Transmission Error:", error);
      let errorMessage = error instanceof Error ? error.message : "Critical Error: Signal lost in cosmic interference.";
      if (errorMessage.includes("quota exceeded")) {
         errorMessage = "Neural quota reached for today. Please wait for the system to reset.";
      }
      await addMessage(chatId!, { 
        role: "model", 
        content: `ALERT: ${errorMessage} // RE-SYNC REQUIRED.` 
      });
      setStreamedResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = async () => {
    if (user && !isGuest && user.email) {
       const newChat = await createChat(user.uid, user.email, "New Chat");
       setCurrentChatId(newChat.id);
    } else {
       setCurrentChatId(null);
    }
    setMessages([{ 
      role: "model", 
      content: "Operational. VOX-AI online. Systems optimized. Awaiting UI parameters.",
      createdAt: new Date()
    }]);
  };

  // 3. Conditional Returns
  if (showSplash) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black overflow-hidden relative">
        <motion.div 
          className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,163,0.1)_0,transparent_70%)]"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 4 }}
        />
        <div className="z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0, rotate: -180, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {/* <AILogo /> */}
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-8 text-center"
          >
            <h1 className="text-4xl font-black tracking-[0.2em] text-white overflow-hidden uppercase">
              AL13N-LLM
            </h1>
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="h-[1px] w-12 bg-white/20" />
              <p className="text-[10px] font-mono tracking-[0.5em] text-brand/60 uppercase">Neural Stream Initializing</p>
              <span className="h-[1px] w-12 bg-white/20" />
            </div>
          </motion.div>
        </div>
        
        {/* Scanning line effect */}
        <motion.div 
          initial={{ top: "-10%" }}
          animate={{ top: "110%" }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 h-[2px] bg-brand/30 z-20 blur-sm shadow-[0_0_15px_rgba(0,255,163,0.5)]"
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          {/* <AILogo /> */}
        </motion.div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return <Login onGuestLogin={() => setIsGuest(true)} />;
  }

  return (
    <div 
      onContextMenu={handleContextMenu}
      className="flex h-screen w-full bg-background text-foreground font-sans selection:bg-brand/20 selection:text-brand overflow-hidden gemini-gradient"
    >
      {/* Settings & Upgrades Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="glass-card max-w-lg w-full p-8 rounded-3xl space-y-6 relative border border-white/10"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Settings size={24} className="text-brand" /> Settings
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}><X size={20} /></Button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-secondary/50 rounded-2xl border border-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={user.photoURL || ""} alt="" className="w-10 h-10 rounded-full border border-border" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-semibold text-sm">{user.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="bg-brand/10 text-brand px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-brand/20 flex items-center gap-1">
                      <Crown size={10} /> Owner
                    </div>
                  )}
                </div>


                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Preferences</p>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-secondary">
                    <History size={18} /> Usage Quotas
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 rounded-xl hover:bg-secondary">
                    <Shield size={18} /> Security Keys
                  </Button>
                  <div className="pt-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground ml-2 mb-1">Export</p>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => exportChat('json')}>
                        <Download size={14} className="mr-2" /> JSON
                      </Button>
                      <Button variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => exportChat('pdf')}>
                        <Download size={14} className="mr-2" /> PDF
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Button 
                    variant="outline"
                    className="flex-1 rounded-xl gap-2" 
                    onClick={() => signOut()}
                  >
                    <LogOut size={18} /> Log Out
                  </Button>
                </div>


                <div className="space-y-1 pt-4 border-t border-border/40">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Neural Engine</p>
                    <div className={cn("grid gap-2", isAdmin ? "grid-cols-2" : "grid-cols-2")}>
                        <Button 
                            variant={activeModel === 'gemini-flash-latest' ? 'default' : 'outline'} 
                            className="rounded-xl text-[10px] h-9"
                            onClick={() => updateModel('gemini-flash-latest')}
                        >
                            V3 Flash (Stable)
                        </Button>
                        <Button 
                            variant={activeModel === 'gemini-3.1-pro-preview' ? 'default' : 'outline'} 
                            className="rounded-xl text-[10px] h-9"
                            onClick={() => updateModel('gemini-3.1-pro-preview')}
                        >
                            V3.1 Pro (Expert)
                        </Button>
                        {isAdmin && (
                          <>
                            <Button 
                                variant={activeModel === 'gemini-2.5-flash-image' ? 'default' : 'outline'} 
                                className="rounded-xl text-[10px] h-9 border-brand/30 text-brand col-span-2"
                                onClick={() => updateModel('gemini-2.5-flash-image')}
                            >
                                <Sparkles size={12} className="mr-1.5" /> Creative Rendering (Owner)
                            </Button>
                          </>
                        )}
                    </div>
                </div>

                <div className="space-y-1 pt-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground ml-2">Default Language</p>
                  <select 
                      className="w-full bg-secondary border border-border rounded-xl p-2 text-xs"
                      value={localStorage.getItem('alien_lang') || 'en-US'}
                      onChange={(e) => localStorage.setItem('alien_lang', e.target.value)}
                  >
                      <option value="en-US">English (US)</option>
                      <option value="hi-IN">Hindi (IN)</option>
                      <option value="es-ES">Spanish (ES)</option>
                      <option value="fr-FR">French (FR)</option>
                      <option value="de-DE">German (DE)</option>
                      <option value="ja-JP">Japanese (JP)</option>
                      <option value="zh-CN">Chinese (CN)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] min-w-[160px] glass-card p-1.5 rounded-xl shadow-2xl border border-white/10"
          >
            <div className="space-y-0.5">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10 rounded-lg transition-colors group">
                <Copy size={14} className="opacity-40 group-hover:opacity-100" /> Copy Transmission
              </button>
              <button className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10 rounded-lg transition-colors group">
                <RefreshCw size={14} className="opacity-40 group-hover:opacity-100" /> Re-sync Stream
              </button>
              <div className="h-px bg-white/5 my-1" />
              <button onClick={startNewChat} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand hover:bg-brand/10 rounded-lg transition-colors group">
                <PlusIcon size={14} className="opacity-40 group-hover:opacity-100" /> New Signal
              </button>
              <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-foreground hover:bg-white/10 rounded-lg transition-colors group">
                <Settings size={14} className="opacity-40 group-hover:opacity-100" /> Neural Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <LegalModal 
        isOpen={legalType !== null} 
        onClose={() => setLegalType(null)} 
        type={legalType || "tos"} 
      />

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Responsive) */}
      <AnimatePresence mode="wait">
        {(isSidebarOpen || isMobileMenuOpen) && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
            className={cn(
               "fixed lg:relative flex flex-col h-full border-r border-border/40 bg-secondary/80 backdrop-blur-3xl z-50 flex-shrink-0 transition-none",
               isMobileMenuOpen ? "w-[280px]" : "w-[300px] hidden lg:flex"
            )}
          >
            <div className="p-4 flex items-center justify-between border-b border-border/40">
              <div className="flex items-center gap-3">
                {/* <AILogo /> */}
                <h1 className="font-bold text-lg tracking-tight">AL13N-LLM</h1>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setIsSidebarOpen(false); setIsMobileMenuOpen(false); }} className="text-muted-foreground hover:text-foreground">
                <PanelLeftClose size={18} />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <div className="space-y-6">


                 <div>
                   <div className="flex items-center justify-between px-2 mb-4">
                     <label className="technical-label">Chats</label>
                     <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-brand" onClick={() => startNewChat()}>
                       <PlusIcon size={14} />
                     </Button>
                   </div>
                   <div className="px-2 mb-4">
                     <div className="relative">
                       <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                       <input
                         type="text"
                         placeholder="Search chats..."
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-brand/40 text-muted-foreground"
                       />
                     </div>
                   </div>
                   <div className="space-y-1.5 h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                     {chats.filter(c => c.title?.toLowerCase().includes(searchQuery.toLowerCase())).slice().sort((a, b) => (b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt).getTime()) - (a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt).getTime())).map((chat) => (
                       <button
                         key={chat.id}
                         onClick={() => setCurrentChatId(chat.id)}
                         className={cn(
                           "w-full text-left p-3 rounded-2xl transition-all group flex items-start gap-4 border",
                           currentChatId === chat.id 
                             ? "bg-brand/10 border-brand/20 text-brand shadow-lg shadow-brand/5" 
                             : "bg-white/[0.02] border-transparent hover:bg-white/5 text-muted-foreground"
                         )}
                       >
                         <div className={cn(
                           "w-1.5 h-1.5 rounded-full mt-1.5 transition-all duration-500",
                           currentChatId === chat.id ? "bg-brand shadow-[0_0_8px_rgba(14,165,233,0.8)] scale-125" : "bg-white/10"
                         )} />
                         <div className="flex-1 min-w-0">
                           <p className="text-[11px] font-bold truncate leading-tight group-hover:text-foreground transition-colors">{chat.title || "Untitled Project"}</p>
                           <p className="text-[9px] opacity-40 font-mono mt-1 lowercase tracking-wider">{chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString() : new Date(chat.updatedAt).toLocaleDateString()}</p>
                         </div>
                       </button>
                     ))}
                     {chats.length === 0 && (
                       <div className="px-3 py-12 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                         <p className="text-[10px] text-muted-foreground/40 font-mono uppercase tracking-widest italic">Zero Neural Records</p>
                       </div>
                     )}
                   </div>
                 </div>
              </div>
            </div>

            <div className="p-4 border-t border-border/40 space-y-1">
               <div className="p-3 bg-secondary/30 rounded-xl mb-4 border border-border/40 flex items-center gap-3 group relative">
                 <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand to-purple-500 shrink-0" />
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-semibold truncate">{user.displayName || "Human"}</p>
                   {isAdmin && <p className="text-[9px] text-brand font-bold uppercase">System Owner</p>}
                 </div>
                 <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowSettings(true)}>
                   <MoreVertical size={16} />
                 </Button>
               </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {(!isSidebarOpen && !isMobileMenuOpen) && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            if (window.innerWidth < 1024) setIsMobileMenuOpen(true);
            else setIsSidebarOpen(true);
          }} 
          className="fixed top-4 left-4 z-30 transition-all hover:scale-110"
        >
          <PanelLeftOpen size={20} />
        </Button>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-row h-full relative w-full overflow-hidden">
        <div className={cn(
          "flex-1 flex flex-col h-full transition-all duration-500 ease-[0.19, 1, 0.22, 1]",
          showArtifacts ? "hidden lg:flex lg:w-1/2" : "w-full"
        )}>
          <header className="flex items-center justify-between p-4 lg:px-8 border-b border-border/40 bg-background/50 backdrop-blur-md z-30 h-16 shrink-0">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(true)}>
                  {/* <AILogo /> */}
                </Button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 border border-border/50 rounded-full cursor-pointer hover:bg-secondary transition-colors" onClick={() => setShowSettings(true)}>
                <span className="text-xs font-semibold">Model: <span className="text-brand">
                  {activeModel.includes('pro') ? 'APEX-PRO' : 
                   activeModel.includes('flash') ? 'APEX-FLASH' : 
                   activeModel.includes('image') ? 'CREATIVE-CORE' : 'STABLE'}
                </span></span>
                <Settings size={12} className="opacity-40" />
              </div>
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-secondary/30 border border-border/50 rounded-full text-[10px] font-mono text-muted-foreground">
                {currentTime.toLocaleDateString()} | {currentTime.toLocaleTimeString()} | {locationError ? <span className="text-red-400">{locationError}</span> : (userLocation ? "📍 Loc Active" : "📍 Loc Pending")}
              </div>
            </div>
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => {
                        setIsEphemeral(!isEphemeral);
                        if (!isEphemeral) setMessages([]); 
                    }}
                    className={cn("transition-colors", isEphemeral ? "text-brand" : "text-muted-foreground")}
                >
                    <EyeOff size={20} />
                </Button>
               {isAdmin && (
                 <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-brand/10 border border-brand/30 rounded-full text-[10px] text-brand font-bold uppercase tracking-wider">
                   <Crown size={12} /> Owner Access
                 </div>
               )}
              <Button variant="ghost" size="icon" className="text-muted-foreground"><Search size={20} /></Button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand to-purple-500 border border-border cursor-pointer" onClick={() => setShowSettings(true)} />
            </div>
          </header>

          <div 
            className="flex-1 overflow-y-auto px-4 lg:px-0 py-8 relative scrollbar-thin scrollbar-thumb-brand/20 scrollbar-track-transparent" 
            ref={scrollAreaRef}
          >
            <div className="max-w-3xl mx-auto space-y-2">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => (
                  <ChatItem key={msg.id || index} role={msg.role} content={msg.content} thinking={msg.thinking} duration={msg.duration} mediaUrl={msg.mediaUrl} mediaType={msg.mediaType} />
                ))}
                {streamedResponse && (
                  <ChatItem 
                    role="model" 
                    content={streamedResponse.content} 
                    thinking={streamedResponse.thinking} 
                    duration={streamedResponse.duration} 
                  />
                )}
              </AnimatePresence>
              <div ref={messagesEndRef} className="h-4" />
            </div>
          </div>

          {/* Input area */}
          <div className="p-4 lg:p-8 pt-2 bg-gradient-to-t from-background via-background/90 to-transparent">
            {queuedItems.length > 0 && (
                <div className="mb-4 bg-secondary/50 rounded-xl p-3 border border-brand/20">
                    <p className="text-[10px] uppercase font-bold text-brand mb-2">Pipeline ({queuedItems.length})</p>
                    {queuedItems.map((item, idx) => (
                        <div key={idx} className="text-xs text-muted-foreground truncate mb-1 flex justify-between">
                            <span>{idx + 1}. {item.type === 'text' ? 'Message' : 'Image'}: {item.summary}</span>
                            <span className={cn("text-[8px] uppercase font-bold ml-2", item.status === 'processing' ? 'text-brand' : 'text-muted-foreground')}>{item.status}</span>
                        </div>
                    ))}
                </div>
            )}
            <ChatInput onSend={handleSend} isLoading={isLoading} isCameraOn={isCameraOn} setIsCameraOn={setIsCameraOn} />
            <div className="mt-4 text-center space-y-2">
              <p className="text-[10px] text-muted-foreground/60 max-w-xl mx-auto">
                AL13N-LLM is an advanced high-fidelity intelligent engine. 
                <span className="hidden sm:inline"> Verify design specs through validation.</span>
                <button onClick={() => setLegalType('privacy')} className="underline ml-1 hover:text-brand transition-colors">Privacy</button>
                <span className="mx-1">&</span>
                <button onClick={() => setLegalType('tos')} className="underline hover:text-brand transition-colors">Terms</button>
              </p>
              <p className="text-[9px] font-mono tracking-tighter opacity-30">
                © 2026 AL13N-LLM - All Rights Reserved. // QUANTUM-ENCRYPTED BY THE ARCHITECT
              </p>
            </div>
          </div>
        </div>

        {/* Artifacts Panel (Canvas/Project View) */}
        <AnimatePresence>
          {showArtifacts && artifactData && (
            <motion.div
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
              className="w-full lg:w-1/2 h-full border-l border-border/40 bg-secondary/10 flex flex-col z-40 shadow-2xl"
            >
              <header className="h-16 flex items-center justify-between px-6 border-b border-border/40 bg-background/40 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    artifactData.type === 'code' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                  )}>
                    {artifactData.type === 'code' ? <Code size={18} /> : <MessageSquare size={18} />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-tight">{artifactData.title}</h3>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">{artifactData.type} Artifact</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setShowArtifacts(false)}>
                    <X size={18} />
                  </Button>
                </div>
              </header>
              <div className="flex-1 overflow-auto p-8 scrollbar-hide bg-black/5">
                <div className="max-w-4xl mx-auto h-full">
                  {artifactData.type === 'code' ? (
                    <div className="relative group h-full">
                      <pre className="p-6 rounded-2xl bg-black border border-white/5 font-mono text-sm leading-relaxed overflow-auto h-full text-blue-50/90 shadow-2xl selection:bg-blue-500/30">
                        {artifactData.content}
                      </pre>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5"
                        onClick={() => {
                          navigator.clipboard.writeText(artifactData.content);
                        }}
                      >
                        <Copy size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none prose-sm bg-white/[0.02] p-8 rounded-3xl border border-white/5 shadow-xl">
                      <ReactMarkdown>{artifactData.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
              <footer className="p-4 border-t border-border/40 flex items-center justify-between bg-background/20 backdrop-blur-md">
                 <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-xl">
                   <Copy size={14} /> Copy Source
                 </Button>
                 <Button className="gap-2 bg-brand text-white hover:bg-brand/90 px-6 rounded-xl font-bold shadow-lg shadow-brand/20">
                    <Download size={16} /> Export Specs
                 </Button>
              </footer>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const Plus = ({ size, className, onClick }: { size: number, className?: string, onClick?: () => void }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} onClick={onClick}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

