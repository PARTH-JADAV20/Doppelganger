import { Code2, Play, Settings, Moon, Sun, Save, Bug } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";
import { motion } from "motion/react";

interface NavbarProps {
  currentFile: string;
  onCompile: () => void;
  onRun: () => void;
  onDebug?: () => void;
  isCompiling: boolean;
  hasUnsavedChanges?: boolean;
}

export function Navbar({ currentFile, onCompile, onRun, onDebug, isCompiling, hasUnsavedChanges }: NavbarProps) {
  const { theme, setTheme } = useTheme();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-white/10 dark:border-white/10 bg-white/80 dark:bg-[#0b0b12]/80 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 shadow-lg">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              VoltC
            </h1>
          </div>
        </div>

        {/* Center: Current File */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/50 dark:bg-white/5 border border-white/20 backdrop-blur-sm">
          <Code2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {currentFile}
            {hasUnsavedChanges && <span className="ml-2 text-orange-500">●</span>}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">

          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={onCompile}
                    disabled={isCompiling}
                    className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white border-0 shadow-lg shadow-purple-500/30 rounded-xl px-6"
                  >
                    {isCompiling ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <>
                        <Code2 className="w-4 h-4 mr-2" />
                        Compile
                      </>
                    )}
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent>
                Compile (Ctrl+Enter)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={onRun}
              variant="outline"
              className="border-white/20 dark:border-white/20 hover:bg-white/10 dark:hover:bg-white/10 rounded-xl"
            >
              <Play className="w-4 h-4 mr-2" />
              Run
            </Button>
          </motion.div>

          {onDebug && (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={onDebug}
                variant="outline"
                className="border-white/20 dark:border-white/20 hover:bg-orange-500/10 dark:hover:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-xl"
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug
              </Button>
            </motion.div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-xl hover:bg-white/10 dark:hover:bg-white/10"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-white/10 dark:hover:bg-white/10"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Settings
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.nav>
  );
}