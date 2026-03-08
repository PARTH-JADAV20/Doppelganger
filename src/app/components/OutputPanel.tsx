import { Terminal, Code, Database, Cpu } from "lucide-react";
import { MemoryPanel } from "./MemoryPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { motion } from "motion/react";
import { cn } from "./ui/utils";

interface MemoryStats {
  stackUsage: number;
  heapUsage: number;
  registersUsed: number;
  instructionCount: number;
}

interface OutputPanelProps {
  output: string;
  assembly: string;
  memoryStats: MemoryStats;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  isDebugMode?: boolean;
  debugStep?: number;
  debugTrace?: any[];
  onDebugNext?: () => void;
  onDebugPrev?: () => void;
}

export function OutputPanel({
  output,
  assembly,
  memoryStats,
  activeTab = "output",
  onTabChange,
  isDebugMode,
  debugStep = 0,
  debugTrace = [],
  onDebugNext,
  onDebugPrev
}: OutputPanelProps) {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white/40 dark:bg-[#16162b]/30 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] h-full flex flex-col"
    >
      <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 min-h-0 flex flex-col">
        <div className="border-b border-white/10 dark:border-white/10 px-4 py-2 bg-white/20 dark:bg-white/5">
          <TabsList className="bg-white/30 dark:bg-white/10 border border-white/20">
            <TabsTrigger
              value="output"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:via-purple-500/20 data-[state=active]:to-indigo-500/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-lg"
            >
              <Terminal className="w-4 h-4 mr-2" />
              Output
            </TabsTrigger>
            <TabsTrigger
              value="assembly"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:via-purple-500/20 data-[state=active]:to-indigo-500/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-lg"
            >
              <Code className="w-4 h-4 mr-2" />
              Assembly
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500/20 data-[state=active]:via-purple-500/20 data-[state=active]:to-indigo-500/20 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 rounded-lg"
            >
              <Database className="w-4 h-4 mr-2" />
              Memory
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="output" className="flex-1 min-h-0 m-0 p-4 overflow-hidden">
          <textarea
            readOnly
            value={output || 'Click "Compile" to see output...'}
            className={cn(
              "w-full h-full font-mono text-sm bg-transparent border-none focus:outline-none resize-none hide-scrollbar",
              output ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400 italic",
              "pb-12" // Extra bottom padding to prevent touching the bottom
            )}
          />
        </TabsContent>

        <TabsContent value="assembly" className="flex-1 min-h-0 m-0 p-4 overflow-hidden">
          <textarea
            readOnly
            value={assembly || "Assembly code will appear here after compilation..."}
            className={cn(
              "w-full h-full font-mono text-sm bg-transparent border-none focus:outline-none resize-none hide-scrollbar",
              assembly ? "text-gray-800 dark:text-gray-200" : "text-gray-500 dark:text-gray-400 italic",
              "pb-12" // Extra bottom padding to prevent touching the bottom
            )}
          />
        </TabsContent>

        <TabsContent value="memory" className="flex-1 min-h-0 bg-transparent dark:bg-[#0f0f1a]/50 overflow-y-auto hide-scrollbar">
          <div className="p-2">
            <MemoryPanel
              trace={debugTrace || []}
              step={debugStep}
              onNext={onDebugNext}
              onPrev={onDebugPrev}
            />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}