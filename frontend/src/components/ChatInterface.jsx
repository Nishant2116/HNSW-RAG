import React, { useState, useRef, useEffect } from 'react';
import { Send, Upload, Sparkles, Bot, User, FileText, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Expandable Result Card Component
function ResultCard({ result, index }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className="bg-black/40 rounded-xl p-3 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer group/card"
    >
      <div className="flex justify-between items-center mb-1.5">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-blue-300/80">
          <FileText size={12} /> {result.filename}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
            {(result.score * 100).toFixed(1)}% Match
          </span>
          <ChevronDown 
            size={14} 
            className={`text-white/30 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </div>
      <div className={`text-xs text-white/50 pl-4 border-l-2 border-white/5 group-hover/card:border-blue-500/50 transition-colors overflow-hidden ${isExpanded ? '' : 'line-clamp-2'}`}>
        {result.content}
      </div>
      {!isExpanded && result.content.length > 150 && (
        <div className="text-[10px] text-blue-400/60 mt-1 pl-4">Click to expand...</div>
      )}
    </motion.div>
  );
}

export function ChatInterface({ 
  onSearch, 
  onUpload, 
  isUploading, 
  searchResults, 
  chatHistory, 
  setChatHistory,
  onReset 
}) {
  const [query, setQuery] = useState('');
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-scroll to bottom using safe DOM manipulation
  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, [chatHistory, searchResults]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    // Optimistic Update
    const userMsg = { role: 'user', content: query };
    setChatHistory(prev => [...prev, userMsg]);
    
    onSearch(query);
    setQuery('');
  };

  const handleFileSelect = (e) => {
    console.log('File selected:', e.target.files?.[0]?.name);
    if (e.target.files?.[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="grid grid-rows-[auto_1fr_auto] h-full bg-[#030308] border-r border-white/5 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-75 group-hover:opacity-100 blur transition duration-200" />
            <div className="relative p-2.5 bg-black rounded-xl border border-white/10">
              <Sparkles className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-xl text-white tracking-tight">HNSW RAG + JINA AI</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[11px] text-white/40 font-medium uppercase tracking-wider">System Online</p>
            </div>
          </div>
        </div>
        
        {/* Reset Button - Uses centralized reset handler */}
        <button 
          onClick={onReset}
          className="text-xs font-medium text-white/30 hover:text-white/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 flex items-center gap-2 group"
        >
          <span>Reset Session</span>
        </button>
      </div>

      {/* Chat Area - Grid Cell for Content */}
      <div className="relative min-h-0">
        {chatHistory.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6 max-w-sm relative z-10"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-500/10 to-indigo-500/10 border border-white/5 flex items-center justify-center shadow-2xl mx-auto">
                <Bot className="w-10 h-10 text-blue-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-white">Welcome back</h2>
                <p className="text-white/40 text-sm leading-relaxed">
                  Connect your documents to the HNSW vector space. Upload a file or ask a query to begin visualization.
                </p>
              </div>
            </motion.div>
          </div>
        ) : (
          <div 
            ref={scrollRef}
            className="absolute inset-0 overflow-y-auto custom-scrollbar scroll-smooth flex flex-col"
          >
            <div className="mt-auto p-6 space-y-8">
              <AnimatePresence mode="popLayout" initial={false}>
                {chatHistory.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-lg
                      ${msg.role === 'user' 
                        ? 'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-400/20 text-white' 
                        : 'bg-gradient-to-b from-zinc-800 to-zinc-900 border-white/10 text-emerald-400'}`}>
                      {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                    </div>
                    
                    <div className={`group relative max-w-[85%]`}>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-md
                        ${msg.role === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-sm text-right' 
                          : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-sm backdrop-blur-sm'
                        }`}>
                        {msg.content}
                      </div>
                      
                      {msg.results && (
                        <div className="mt-3 grid gap-2">
                          {msg.results.map((res, rIdx) => (
                            <ResultCard key={rIdx} result={res} index={rIdx} />
                          ))}
                        </div>
                      )}
                      <div className={`text-[10px] mt-1.5 text-white/20 font-medium ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        {msg.role === 'user' ? 'You' : 'VectorWeave AI'} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user' && (
                   <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-9 h-9 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center">
                         <Bot size={16} className="text-emerald-500/50" />
                      </div>
                      <div className="flex gap-1 bg-white/5 px-4 py-3 rounded-2xl rounded-tl-sm">
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                   </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-5 border-t border-white/5 bg-[#030308]/90 backdrop-blur-xl z-20">
        <form onSubmit={handleSubmit} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-md" />
          <div className="relative flex items-center bg-[#0a0a12] border border-white/10 rounded-xl shadow-2xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 hover:border-white/20 transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]">
            
            {/* Upload Button */}
            <div className="pl-2">
              <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="p-2.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                {isUploading ? <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin" /> : <Upload size={20} />}
              </button>
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your data..."
              className="flex-1 bg-transparent border-none text-white placeholder-white/20 text-sm px-4 py-4 focus:outline-none focus:ring-0"
            />
            
            <button 
              type="submit"
              disabled={!query.trim()}
              className="m-1.5 p-2.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Send size={18} strokeWidth={2.5} className="ml-0.5" />
            </button>
          </div>
        </form>
        <p className="text-center text-[10px] text-white/20 mt-3 font-medium tracking-wide">
          AI may produce inaccurate information. Verify important results.
        </p>
      </div>
    </div>
  );
}
