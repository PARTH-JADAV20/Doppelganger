import { motion } from "framer-motion";
import { Github, LogOut, Code, Info } from "lucide-react";
import { Button } from "./ui/button";
import { useGitHubStore } from "../../store/githubStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

interface StatusBarProps {
  currentFile: string;
  language?: string;
  compiler?: string;
  targetISA?: string;
  cursorPosition?: { line: number; column: number };
  compileStatus?: "idle" | "compiling" | "success" | "error";
}

export function StatusBar({ 
  currentFile, 
  language = "C", 
  compiler = "VoltC", 
  targetISA = "Custom", 
  cursorPosition, 
  compileStatus 
}: StatusBarProps) {
  const { isConnected, username, clearSession } = useGitHubStore();

  const handleLogin = () => {
    window.location.href = "http://localhost:3001/auth/github";
  };

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-8 bg-white/80 dark:bg-[#0b0b12]/80 backdrop-blur-md border-t border-gray-200 dark:border-white/10 px-4 flex items-center justify-between text-xs"
    >
      <div className="flex items-center gap-4">
        {/* Compilation Status indicator */}
        <div className="flex items-center gap-1.5 border-r border-gray-200 dark:border-white/10 pr-4 h-4">
          <div className={`w-2 h-2 rounded-full ${
            compileStatus === "success" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
            compileStatus === "error" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" :
            compileStatus === "compiling" ? "bg-yellow-500 animate-pulse" :
            "bg-gray-400"
          }`} />
          <span className="font-semibold uppercase tracking-tighter text-[10px] text-gray-500 dark:text-gray-400">
            {compileStatus || "IDLE"}
          </span>
        </div>

        {/* Info badges */}
        <div className="flex items-center gap-3">
            <span className="text-gray-400 dark:text-gray-500">{language}</span>
            <span className="text-gray-400 dark:text-gray-500">{compiler}</span>
            <span className="text-gray-400 dark:text-gray-500">{targetISA}</span>
        </div>

        {/* Current File */}
        {currentFile && (
          <div className="flex items-center gap-1.5 border-l border-gray-200 dark:border-white/10 pl-4 h-4">
            <Code className="w-3 h-3 text-indigo-500/60" />
            <span className="text-gray-500 dark:text-gray-400 font-mono">
              {currentFile}
            </span>
          </div>
        )}

        {/* Cursor Position */}
        {cursorPosition && (
          <div className="flex items-center gap-1 border-l border-gray-200 dark:border-white/10 pl-4 h-4 text-gray-400 dark:text-gray-500 font-mono">
            <span>Ln {cursorPosition.line},</span>
            <span>Col {cursorPosition.column}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* GitHub Status (The "less important" button) */}
        <div className="flex items-center gap-2 border-r border-gray-200 dark:border-white/10 pr-3 h-4">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500/60' : 'bg-gray-400'}`} />
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest font-bold">
            {isConnected ? username : 'GitHub Offline'}
          </span>
        </div>
        {isConnected ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearSession}
                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Disconnect GitHub</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogin}
            className="h-6 px-2 text-indigo-500 hover:text-indigo-600 hover:bg-indigo-500/10 flex items-center gap-1.5 transition-all text-[10px] font-semibold tracking-wider uppercase"
          >
            <Github className="w-3 h-3" />
            Connect GitHub
          </Button>
        )}
        
        <div className="border-l border-gray-200 dark:border-white/10 ml-2 pl-2 h-4 flex items-center">
            <Info className="w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>
    </motion.div>
  );
}