import { Code2, Zap, Cpu, MapPin, Command } from "lucide-react";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";

interface StatusBarProps {
  language: string;
  compiler: string;
  targetISA: string;
  cursorPosition: { line: number; column: number };
  compileStatus: "idle" | "compiling" | "success" | "error";
}

export function StatusBar({
  language,
  compiler,
  targetISA,
  cursorPosition,
  compileStatus,
}: StatusBarProps) {
  const statusColors = {
    idle: "bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30",
    compiling: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30",
    success: "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30",
    error: "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30",
  };

  const statusText = {
    idle: "Ready",
    compiling: "Compiling...",
    success: "Compiled Successfully",
    error: "Compilation Error",
  };

  return (
    <motion.footer
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="border-t border-white/10 dark:border-white/10 bg-white/80 dark:bg-[#0b0b12]/80 backdrop-blur-xl px-6 py-2"
    >
      <div className="flex items-center justify-between text-xs">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Language:</span> {language}
            </span>
          </div>

          <div className="w-px h-4 bg-white/20 dark:bg-white/20" />

          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Compiler:</span> {compiler}
            </span>
          </div>

          <div className="w-px h-4 bg-white/20 dark:bg-white/20" />

          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-700 dark:text-gray-300">
              <span className="font-medium">Target ISA:</span> {targetISA}
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <Command className="w-3 h-3" />
            <span className="text-[10px]">
              Compile: <kbd className="px-1 py-0.5 bg-white/20 dark:bg-white/10 rounded">Ctrl+Enter</kbd> | 
              Toggle Explorer: <kbd className="px-1 py-0.5 bg-white/20 dark:bg-white/10 rounded ml-1">Ctrl+B</kbd>
            </span>
          </div>

          <div className="w-px h-4 bg-white/20 dark:bg-white/20" />

          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="text-gray-700 dark:text-gray-300">
              Ln {cursorPosition.line}, Col {cursorPosition.column}
            </span>
          </div>

          <div className="w-px h-4 bg-white/20 dark:bg-white/20" />

          <Badge
            className={`${statusColors[compileStatus]} border rounded-lg px-2 py-0.5`}
            variant="outline"
          >
            {statusText[compileStatus]}
          </Badge>
        </div>
      </div>
    </motion.footer>
  );
}