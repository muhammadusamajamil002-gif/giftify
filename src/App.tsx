/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Skull, 
  Zap, 
  Eye, 
  Settings, 
  AlertCircle, 
  Loader2, 
  Cigarette,
  ChevronRight,
  RefreshCw,
  Ghost,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types ---
interface ProcessingState {
  isAnalyzing: boolean;
  isGenerating: boolean;
  error: string | null;
  currentPrompt: string | null;
}

export default function App() {
  // --- State ---
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    ''
  );
  const [imageBefore, setImageBefore] = useState<string | null>(null);
  const [imageAfter, setImageAfter] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [processing, setProcessing] = useState<ProcessingState>({
    isAnalyzing: false,
    isGenerating: false,
    error: null,
    currentPrompt: null,
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Logic ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBefore(reader.result as string);
        setImageAfter(null);
        setProcessing(prev => ({ ...prev, error: null, currentPrompt: null }));
      };
      reader.readAsDataURL(file);
    }
  };

  const transformToHorror = async () => {
    if (!apiKey) {
      setProcessing(prev => ({ ...prev, error: "API Key required. Please provide it in the sidebar." }));
      setIsSidebarOpen(true);
      return;
    }
    if (!imageBefore) return;

    setProcessing(prev => ({ ...prev, isAnalyzing: true, error: null, isGenerating: false }));

    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = imageBefore.split(',')[1];
      const mimeType = imageBefore.split(';')[0].split(':')[1];

      // Step 1: Generate Horror Prompt using Gemini 3 Flash
      const analysisResponse = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType
                }
              },
              {
                text: "Analyze this image and describe its core elements. Then, write a highly detailed, cinematic, and terrifying horror prompt for an image generator (like Imagen) to transform this exact scene into its darkest, most disturbing version. Focus on eerie lighting, body horror, cosmic dread, or atmospheric gloom. Be extremely descriptive. Format: Analysis: [text] \n\nPrompt: [text]"
              }
            ]
          }
        ]
      });

      const fullText = analysisResponse.text;
      const promptMatch = fullText.match(/Prompt:\s*(.*)/is);
      const generatedPrompt = promptMatch ? promptMatch[1].trim() : fullText;

      setProcessing(prev => ({ ...prev, isAnalyzing: false, isGenerating: true, currentPrompt: generatedPrompt }));

      // Step 2: Generate Horror Image using gemini-2.5-flash-image
      const generationResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType
              },
            },
            {
              text: `Transform the original scene into this horror version: ${generatedPrompt}. Ensure the final result is photorealistic, cinematic, and extremely unsettling.`,
            },
          ],
        },
      });

      let foundImage = false;
      for (const part of generationResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          const horrorBase64 = part.inlineData.data;
          setImageAfter(`data:image/png;base64,${horrorBase64}`);
          foundImage = true;
          break;
        }
      }

      if (!foundImage) {
        throw new Error("Model failed to return an image outcome. The prompt might have been too dark for safety filters.");
      }

    } catch (err: any) {
      console.error("Horror Transmutation Error:", err);
      
      let errorMessage = "An unexpected horror occurred during transmission.";
      
      // Handle Specific Quota Errors
      if (err.message?.includes("429") || err.message?.includes("quota")) {
        errorMessage = "QUOTA_EXHAUSTED: The AI is currently overwhelmed by the darkness. Please wait 60 seconds before initiating the protocol again.";
      } else if (err.message?.includes("API_KEY_INVALID")) {
        errorMessage = "INVALID_KEY: Security credentials rejected. Check your API key in the sidebar.";
      } else {
        errorMessage = err.message || errorMessage;
      }

      setProcessing(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isAnalyzing: false, 
        isGenerating: false 
      }));
    } finally {
      setProcessing(prev => ({ ...prev, isAnalyzing: false, isGenerating: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans overflow-x-hidden flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden flex items-center justify-between px-6 py-4 bg-[#0a0a0a] border-b border-[#1a1a1a] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Cigarette className="w-5 h-5 text-blue-400" />
          <h1 className="text-xs font-bold tracking-widest text-white uppercase">Nexus Horror</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30"
          aria-label="Toggle Sidebar"
        >
          {isSidebarOpen ? <X className="w-5 h-5 text-blue-400" /> : <Menu className="w-5 h-5 text-blue-400" />}
        </button>
      </header>

      {/* Sidebar - Control Panel */}
      <AnimatePresence>
        {(isSidebarOpen || (typeof window !== 'undefined' && window.innerWidth >= 768)) && (
          <motion.aside 
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed md:relative inset-y-0 left-0 w-80 border-r border-[#1a1a1a] bg-[#0a0a0a]/95 md:bg-[#0a0a0a]/80 backdrop-blur-xl p-8 flex flex-col gap-8 flex-shrink-0 z-50 md:z-20 md:flex`}
          >
            <div className="flex items-center justify-between md:justify-start gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <Cigarette className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-sm font-bold tracking-widest text-white uppercase">Nexus Horror</h1>
                  <p className="text-[10px] text-blue-400/60 font-mono tracking-tighter">OS_VERSION: v4.1.2</p>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-white/40 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                <Settings className="w-3 h-3" />
                Security Credentials
              </label>
              <div className="relative">
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="GEMINI_API_KEY"
                  className="w-full bg-[#111] border border-[#222] rounded-md px-4 py-3 text-xs focus:outline-none focus:border-blue-500/50 transition-colors font-mono"
                />
                {!apiKey && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <AlertCircle className="w-4 h-4 text-orange-400 animate-pulse" />
                  </div>
                )}
              </div>
              <p className="text-[9px] text-white/40 leading-relaxed font-mono">
                {apiKey ? "ENCRYPTED_KEY_DETECTED" : "AWAITING_INPUT_FOR_GENESIS"}
              </p>
            </div>

            <div className="mt-auto space-y-4 pt-6 border-t border-[#1a1a1a]">
              <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                <h3 className="text-[10px] font-bold text-orange-400 uppercase mb-2 flex items-center gap-2">
                  <Zap className="w-3 h-3" /> System Logs
                </h3>
                <div className="space-y-1 font-mono text-[9px] text-orange-300/60">
                  <p>{`> UPLOAD STATUS: ${imageBefore ? 'READY' : 'IDLE'}`}</p>
                  <p>{`> ANALYSIS: ${processing.isAnalyzing ? 'ACTIVE' : 'STANDBY'}`}</p>
                  <p>{`> MUTATION: ${processing.isGenerating ? 'ACTIVE' : 'STANDBY'}`}</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Area */}
      <main className="flex-1 relative overflow-y-auto custom-scrollbar">
        {/* Background glow effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[80%] md:w-[40%] h-[40%] bg-blue-500/5 blur-[100px] md:blur-[150px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[80%] md:w-[40%] h-[40%] bg-red-500/5 blur-[100px] md:blur-[150px] rounded-full" />
        </div>

        <div className="max-w-6xl mx-auto p-6 md:p-12 relative z-10">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2">
                Image <span className="font-bold text-blue-400 italic">Transmutation</span>
              </h2>
              <p className="text-white/40 text-xs md:text-sm max-w-md">
                Protocol used to isolate fear from digital artifacts. Our AI models analyze and mutate visual data into pure cinematic horror.
              </p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full md:w-auto group flex items-center justify-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all text-xs font-medium"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                Upload Specimen
              </button>
            </div>
          </header>

          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-12">
            {/* Specimen One: Before */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Eye className="w-3 h-3" /> Original Source
                </label>
                <div className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-mono text-blue-400">
                  REF_ALPHA_01
                </div>
              </div>
              <div className="aspect-[4/5] bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden relative group">
                {imageBefore ? (
                  <img src={imageBefore} alt="Original" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" referrerPolicy="no-referrer" />
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-colors p-4 text-center"
                  >
                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                      <Upload className="w-5 h-5 md:w-6 md:h-6 text-white/40" />
                    </div>
                    <span className="text-[10px] md:text-xs text-white/30 uppercase tracking-widest font-bold">Inject Visual Data</span>
                  </div>
                )}
                {/* Visual accents */}
                <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-blue-500/40" />
                <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-blue-500/40" />
                <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-blue-500/40" />
                <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-blue-500/40" />
              </div>
            </div>

            {/* Specimen Two: After */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-red-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Skull className="w-3 h-3" /> Mutated Result
                </label>
                <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[9px] font-mono text-red-500">
                  SIGMA_HORROR_02
                </div>
              </div>
              <div className="aspect-[4/5] bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl overflow-hidden relative">
                <AnimatePresence mode="wait">
                  {imageAfter ? (
                    <motion.img 
                      key="result"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      src={imageAfter} 
                      alt="Horror result" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : processing.isAnalyzing || processing.isGenerating ? (
                    <motion.div 
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center bg-[#070707]/80 backdrop-blur-sm p-4 text-center"
                    >
                      <Loader2 className="w-10 h-10 md:w-12 md:h-12 text-blue-500 animate-spin mb-6 stroke-[1px]" />
                      <div className="space-y-4 text-center">
                        <div className="h-0.5 md:h-1 w-32 md:w-48 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-blue-500"
                            animate={{ x: [-192, 192] }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          />
                        </div>
                        <p className="text-[9px] md:text-[10px] text-blue-400 font-mono tracking-widest uppercase animate-pulse">
                          {processing.isAnalyzing ? "Analyzing Neural Patterns..." : "Synthesizing Horror Artifacts..."}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <Ghost className="w-10 h-10 md:w-12 md:h-12 text-white/10 mb-4" />
                      <span className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-bold leading-tight">Waiting for Genesis</span>
                    </div>
                  )}
                </AnimatePresence>
                
                {/* Error overlay */}
                {processing.error && (
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 bg-red-950/80 backdrop-blur-md border-t border-red-500/30">
                    <div className="flex gap-3 md:gap-4 items-start">
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[10px] md:text-xs font-bold text-red-200 uppercase mb-1">Critical Fault</h4>
                        <p className="text-[9px] md:text-[10px] text-red-300 leading-relaxed font-mono">{processing.error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan line effect */}
                {(processing.isAnalyzing || processing.isGenerating) && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <motion.div 
                      className="w-full h-px bg-blue-500/50 shadow-[0_0_15px_blue]"
                      animate={{ top: ['0%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col items-center gap-6">
            <button 
              onClick={transformToHorror}
              disabled={!imageBefore || processing.isAnalyzing || processing.isGenerating}
              className="relative group disabled:opacity-50 disabled:cursor-not-allowed w-full max-w-sm md:w-auto"
            >
              <div className="absolute -inset-4 bg-blue-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
              <div className="relative flex items-center justify-center gap-3 md:gap-4 px-8 md:px-12 py-4 md:py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-[0_0_30px_rgba(37,99,235,0.4)] overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="text-[11px] md:text-sm font-bold tracking-[0.2em] uppercase">Initiate Horror Protocol</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {processing.currentPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-2xl w-full p-4 md:p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[9px] md:text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                    <RefreshCw className="w-3 h-3" /> Mutation Script
                  </h4>
                  <button 
                    onClick={() => setImageAfter(null)}
                    className="text-[9px] text-blue-400 hover:text-blue-300 uppercase tracking-widest font-bold"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-[10px] md:text-[11px] text-white/60 leading-relaxed font-mono italic">
                  "{processing.currentPrompt}"
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #050505; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #222; }
      `}</style>
    </div>
  );
}
