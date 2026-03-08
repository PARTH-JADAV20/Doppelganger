import { Code2, Play, Moon, Sun, Bug, PanelLeft } from "lucide-react";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { RepoSelector } from "./RepoSelector";
import { GitHubPushButton } from "./GitHubPushButton";

interface NavbarProps {
  currentFile: string;
  currentCode: string; // Needed for Push Button
  onCompile: () => void;
  onRun: () => void;
  onDebug?: () => void;
  onRepoSelect?: (repo: any) => void;
  onPushGithub?: () => void;
  isCompiling: boolean;
  hasUnsavedChanges?: boolean;
  isSidebarVisible: boolean;
  onToggleSidebar: () => void;
}

export function Navbar({
  currentFile,
  currentCode,
  onCompile,
  onRun,
  onDebug,
  onRepoSelect,
  onPushGithub,
  isCompiling,
  hasUnsavedChanges,
  isSidebarVisible,
  onToggleSidebar
}: NavbarProps) {

  const { theme, setTheme } = useTheme();

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-40 border-b border-white/5 dark:border-white/5 bg-white/80 dark:bg-[#0b0b12]/90 backdrop-blur-md"
    >
      <div className="flex items-center justify-between px-4 py-1.5 h-12">
        {/* Left: Logo and Explorer */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 via-purple-600 to-indigo-600 shadow-md">
              <Code2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-sm font-bold bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
              VoltC
            </h1>

            <div className="h-4 w-[1px] bg-white/10 mx-1" />

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleSidebar}
                    className={`h-8 w-8 rounded-lg transition-colors ${isSidebarVisible ? "bg-purple-500/10 text-purple-600" : "hover:bg-white/5"}`}
                  >
                    <PanelLeft className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-[10px]">
                  {isSidebarVisible ? "Hide" : "Show"} Explorer (Ctrl+B)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex items-center gap-1">
            {onRepoSelect && <RepoSelector onRepoSelect={onRepoSelect} />}
          </div>
        </div>

        {/* Center: Current File (Compact) */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/5 dark:bg-white/5 border border-white/10 max-w-[200px] sm:max-w-[400px]">
          <Code2 className="w-3.5 h-3.5 text-purple-500/70" />
          <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 truncate">
            {currentFile.split('/').pop()}
            {hasUnsavedChanges && <span className="ml-1.5 text-orange-500 text-[8px]">●</span>}
          </span>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">

          {onPushGithub && (
            <GitHubPushButton
              currentFile={currentFile}
              code={currentCode}
              onCodeSaved={onPushGithub}
            />
          )}

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCompile}
                  disabled={isCompiling}
                  size="sm"
                  className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 hover:from-pink-600 hover:via-purple-700 hover:to-indigo-700 text-white border-0 shadow-sm rounded-lg h-8 px-4 text-[11px] font-bold"
                >
                  {isCompiling ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <>
                      <Code2 className="w-3.5 h-3.5 mr-1.5" />
                      Compile
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">
                Compile (Ctrl+Enter)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            onClick={onRun}
            variant="outline"
            size="sm"
            className="border-white/10 hover:bg-white/5 rounded-lg h-8 px-3 text-[11px] font-medium"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Run
          </Button>

          {onDebug && (
            <Button
              onClick={onDebug}
              variant="outline"
              size="sm"
              className="border-white/10 hover:bg-orange-500/10 text-orange-400 rounded-lg h-8 px-3 text-[11px] font-medium"
            >
              <Bug className="w-3.5 h-3.5 mr-1.5" />
              Debug
            </Button>
          )}

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-8 w-8 rounded-lg hover:bg-white/5"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-gray-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-400" />
            )}
          </Button>
        </div>
      </div>
    </motion.nav>
  );
}