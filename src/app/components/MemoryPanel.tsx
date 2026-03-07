import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, SkipForward, ArrowRight, Layers, Database } from "lucide-react";
import { RegisterPanel, StackPanel, VariableTable, ExecutionStats } from "./DebuggerSegments";

// --- Instruction Timeline Panel ---
export const InstructionTimeline = ({
  instructions,
  currentIdx,
  onStep
}: {
  instructions: string[],
  currentIdx: number,
  onStep?: () => void
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.children[currentIdx] as HTMLElement;
      if (activeElement) {
        scrollRef.current.scrollTo({
          top: activeElement.offsetTop - 100,
          behavior: "smooth"
        });
      }
    }
  }, [currentIdx]);

  return (
    <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-green-500 min-w-0">
          <Play size={18} className="shrink-0" />
          <h3 className="font-bold uppercase tracking-wider text-sm truncate">Timeline</h3>
        </div>
        {onStep && (
          <button
            onClick={onStep}
            className="p-1 px-3 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 flex items-center gap-2 transition-all active:scale-95 shrink-0"
          >
            <SkipForward size={14} />
            <span className="text-[10px] font-bold uppercase">Step</span>
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto hide-scrollbar space-y-1 pr-2"
      >
        {instructions.map((inst, i) => (
          <motion.div
            key={`${inst}-${i}`}
            className={`flex items-center gap-3 p-2 rounded-lg border font-mono text-xs transition-all ${i === currentIdx
                ? "bg-green-500/20 border-green-500/50 text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                : "border-transparent text-gray-400 opacity-60 hover:opacity-100"
              }`}
          >
            <span className="w-6 text-right text-[10px] opacity-40">{i + 1}</span>
            <span className="flex-1">{inst}</span>
            {i === currentIdx && <ArrowRight size={14} className="animate-pulse" />}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- Memory Layout Visualization ---
export const MemoryLayout = ({ stackDepth, totalSize }: { stackDepth: number, totalSize: number }) => {
  const stackHeight = (stackDepth / totalSize) * 100;

  return (
    <div className="bg-white/10 dark:bg-white/5 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-4 text-orange-500">
        <Layers size={18} />
        <h3 className="font-bold uppercase tracking-wider text-sm">Memory Map</h3>
      </div>
      <div className="h-[150px] w-full bg-black/30 rounded-xl relative overflow-hidden border border-white/10">
        {/* Stack Segment */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(25, stackHeight)}%` }}
          style={{ minHeight: '32px' }}
          className="absolute top-0 w-full bg-gradient-to-b from-purple-500/70 to-pink-500/50 border-b border-purple-500/60 flex flex-col items-center justify-center"
        >
          <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">Stack</span>
        </motion.div>

        {/* Free space */}
        <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-end pointer-events-none">
          <div className="p-4 flex flex-col items-center opacity-20">
            <Database size={24} className="text-gray-500 mb-2" />
            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Available</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Memory Panel Container ---
export const MemoryPanel = ({
  trace,
  step,
  onNext
}: {
  trace: any[],
  step: number,
  onNext?: () => void
}) => {
  const current = trace[step] || {
    registers: { R0: 0, R1: 0, R2: 0, R3: 0, BP: 1024, SP: 1024 },
    stack: [],
    vars: [],
    stats: { registersUsed: 0, totalRegisters: 6, instructionCount: 0, stackDepth: 0, cycles: 0, heapUsage: 0, stackUsage: 0 },
    instructions: [],
    pc: 0,
    func: "main"
  };

  // Process trace into component-friendly data
  const registers = {
    R0: current.r0 || 0,
    R1: current.r1 || 0,
    R2: current.r2 || 0,
    R3: current.r3 || 0,
    BP: current.bp,
    SP: current.sp
  };

  const variables = current.vars || [];

  // Reconstruct call stack from BP changes or use provided func info
  // For now, let's use a simplified stack frame list
  const stackFrames = [current.func];

  const stats = {
    registersUsed: (current.r0 !== 0 ? 1 : 0) + (current.r1 !== 0 ? 1 : 0) + (current.r2 !== 0 ? 1 : 0) + (current.r3 !== 0 ? 1 : 0) + 2,
    totalRegisters: 6,
    instructionCount: trace.length,
    stackDepth: Math.max(0, (1024 - (current.sp || 1024)) / 10),
    cycles: current.tick || 0,
    heapUsage: 0,
    stackUsage: Math.round(((1024 - (current.sp || 1024)) / 1024) * 100) || 0
  };

  const allInstructions = trace.map(t => t.op); // This is just Opcode strings for now
  // Realistically we'd want the full source string but op is okay

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-4 p-1 pb-10">
      {/* Column 1: Core State */}
      <div className="space-y-4 min-w-0 overflow-hidden">
        <RegisterPanel registers={registers} />
        <StackPanel stack={stackFrames} />
        <VariableTable variables={variables} />
      </div>

      {/* Column 2: Stats & Timeline */}
      <div className="space-y-4 flex flex-col min-h-[500px] min-w-0 overflow-hidden">
        <ExecutionStats stats={stats} />
        <MemoryLayout stackDepth={1024 - current.sp} totalSize={1024} />
        <div className="flex-1 min-h-[300px]">
          <InstructionTimeline
            instructions={trace.map(t => `${t.op} ...`)}
            currentIdx={step}
            onStep={onNext}
          />
        </div>
      </div>
    </div>
  );
};
