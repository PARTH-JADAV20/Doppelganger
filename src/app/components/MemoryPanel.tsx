import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, SkipForward, ArrowRight, Layers, Database } from "lucide-react";
import { RegisterPanel, StackPanel, VariableTable, ExecutionStats } from "./DebuggerSegments";

// --- Instruction Timeline Panel ---
// STEP 6: Instruction Timeline - Enhanced to show dynamic trace information
export const InstructionTimeline = ({
  instructions,
  currentIdx,
  onStep,
  onPrevStep,
  trace
}: {
  instructions: string[],
  currentIdx: number,
  onStep?: () => void,
  onPrevStep?: () => void,
  trace?: any[]
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

  // Get additional info for each instruction from trace
  const getInstructionInfo = (index: number) => {
    if (!trace || !trace[index]) return null;
    const step = trace[index];
    return {
      pc: typeof step.pc === 'number' ? step.pc : index,
      func: step.func || 'unknown',
      tick: typeof step.tick === 'number' ? step.tick : index
    };
  };

  return (
    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl p-4 shadow-xl flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-green-600 dark:text-green-500 min-w-0">
          <Play size={18} className="shrink-0" />
          <h3 className="font-bold uppercase tracking-wider text-sm truncate">Timeline</h3>
          {trace && trace.length > 0 && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400">
              Step {currentIdx + 1} / {trace.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onPrevStep && (
            <button
              onClick={onPrevStep}
              disabled={!trace || currentIdx <= 0}
              className={`p-1 px-3 rounded-lg border flex items-center gap-2 transition-all active:scale-95 shrink-0 ${!trace || currentIdx <= 0
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700 cursor-not-allowed"
                : "bg-blue-100 dark:bg-blue-500/20 hover:bg-blue-200 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-500/30"
                }`}
            >
              <SkipForward size={14} className="rotate-180" />
              <span className="text-[10px] font-bold uppercase">Prev</span>
            </button>
          )}
          {onStep && (
            <button
              onClick={onStep}
              disabled={!trace || currentIdx >= trace.length - 1}
              className={`p-1 px-3 rounded-lg border flex items-center gap-2 transition-all active:scale-95 shrink-0 ${!trace || currentIdx >= trace.length - 1
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 border-gray-300 dark:border-gray-700 cursor-not-allowed"
                : "bg-green-100 dark:bg-green-500/20 hover:bg-green-200 dark:hover:bg-green-500/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/30"
                }`}
            >
              <SkipForward size={14} />
              <span className="text-[10px] font-bold uppercase">
                {!trace || currentIdx >= trace.length - 1 ? "End" : "Step"}
              </span>
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto hide-scrollbar space-y-1 pr-2"
      >
        {instructions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No instructions to display
          </div>
        ) : (
          instructions.map((inst, i) => {
            const info = getInstructionInfo(i);
            const isActive = i === currentIdx;

            return (
              <motion.div
                key={`${inst}-${i}-${info?.pc || i}`}
                className={`flex items-start gap-2 p-2 rounded-lg border font-mono text-xs transition-all ${isActive
                  ? "bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/50 text-green-800 dark:text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                  : "border-transparent text-gray-600 dark:text-gray-400 opacity-60 hover:opacity-100"
                  }`}
              >
                <span className="w-8 text-right text-[10px] opacity-60 shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{inst}</span>
                    {isActive && <ArrowRight size={12} className="animate-pulse shrink-0" />}
                  </div>
                  {info && (
                    <div className="flex items-center gap-3 mt-1 text-[9px] opacity-70">
                      <span>PC: {info.pc}</span>
                      {info.func && info.func !== 'unknown' && (
                        <span className="text-purple-600 dark:text-purple-400">@{info.func}</span>
                      )}
                      <span>tick: {info.tick}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

// --- Memory Layout Visualization ---
// STEP 4: Memory Map - Display dynamic memory layout from trace data
export const MemoryLayout = ({
  stackDepth,
  totalSize,
  sp,
  bp,
  spMax
}: {
  stackDepth: number,
  totalSize: number,
  sp?: number,
  bp?: number,
  spMax?: number
}) => {
  // Calculate stack usage percentage
  const stackHeight = totalSize > 0 ? Math.max(0, Math.min(100, (stackDepth / totalSize) * 100)) : 0;

  // Calculate positions for SP and BP markers (if provided)
  // Stack grows downward, so SP at bottom means more stack used
  const spPosition = sp !== undefined && spMax !== undefined && spMax > 0
    ? ((spMax - sp) / spMax) * 100
    : stackHeight;
  const bpPosition = bp !== undefined && spMax !== undefined && spMax > 0
    ? ((spMax - bp) / spMax) * 100
    : stackHeight;

  return (
    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-500">
          <Layers size={18} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Memory Map</h3>
        </div>
        {spMax !== undefined && sp !== undefined && (
          <div className="text-xs text-gray-600 dark:text-gray-400 font-mono">
            {stackDepth} / {spMax} bytes
          </div>
        )}
      </div>
      <div className="h-[150px] w-full bg-gray-100 dark:bg-black/30 rounded-xl relative overflow-hidden border border-gray-200 dark:border-white/10">
        {/* Stack Segment - Shows used stack memory */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${Math.max(2, stackHeight)}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          style={{ minHeight: stackHeight > 0 ? '24px' : '0px' }}
          className="absolute top-0 w-full bg-gradient-to-b from-purple-500/70 to-pink-500/50 border-b border-purple-500/60 flex flex-col items-center justify-center"
        >
          {stackHeight > 5 && (
            <span className="text-[10px] font-black text-white uppercase tracking-widest leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              Stack ({Math.round(stackHeight)}%)
            </span>
          )}
        </motion.div>

        {/* BP Marker - Shows Base Pointer position */}
        {bp !== undefined && spMax !== undefined && bp < spMax && bpPosition > 0 && bpPosition < 100 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-blue-400 dark:border-blue-500 z-10"
            style={{ top: `${bpPosition}%` }}
          >
            <div className="absolute left-2 top-[-8px] text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-black/80 px-1 rounded">
              BP
            </div>
          </div>
        )}

        {/* SP Marker - Shows Stack Pointer position */}
        {sp !== undefined && spMax !== undefined && sp < spMax && spPosition > 0 && spPosition < 100 && (
          <div
            className="absolute left-0 right-0 border-t-2 border-green-400 dark:border-green-500 z-10 border-dashed"
            style={{ top: `${spPosition}%` }}
          >
            <div className="absolute right-2 top-[-8px] text-[9px] font-bold text-green-600 dark:text-green-400 bg-white/80 dark:bg-black/80 px-1 rounded">
              SP
            </div>
          </div>
        )}

        {/* Free space */}
        <div className="absolute inset-x-0 bottom-0 h-full flex flex-col justify-end pointer-events-none">
          <div className="p-4 flex flex-col items-center opacity-40 dark:opacity-30">
            <div className="relative mb-2">
              <Database size={24} className="text-gray-500 dark:text-gray-400" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
              />
            </div>
            <span className="text-[10px] text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-center">
              Available Memory<br />
              <span className="font-mono text-xs opacity-80">{Math.round(100 - stackHeight)}% FREE</span>
            </span>
          </div>
        </div>

        {/* Address markers */}
        <div className="absolute left-0 top-0 h-full w-1.5 flex flex-col justify-between py-1 bg-black/10">
          <div className="w-full h-px bg-white/20" />
          <div className="w-full h-px bg-white/10" />
          <div className="w-full h-px bg-white/10" />
          <div className="w-full h-px bg-white/20" />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-tighter">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-purple-500" />
          <span className="text-gray-600 dark:text-gray-400">Stack</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">BP Marker</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-gray-600 dark:text-gray-400">SP Marker</span>
        </div>
      </div>
    </div>
  );
};

// --- Main Memory Panel Container ---
export const MemoryPanel = ({
  trace,
  step,
  onNext,
  onPrev
}: {
  trace: any[],
  step: number,
  onNext?: () => void,
  onPrev?: () => void
}) => {
  // Get current step data from trace, or use empty state if no trace
  const current = trace && trace.length > 0 && step >= 0 && step < trace.length
    ? trace[step]
    : null;

  // Process trace into component-friendly data
  // STEP 1: Registers - Extract real register values from trace data
  const registers = current ? {
    R0: typeof current.r0 === 'number' ? current.r0 : 0,
    R1: typeof current.r1 === 'number' ? current.r1 : 0,
    R2: typeof current.r2 === 'number' ? current.r2 : 0,
    R3: typeof current.r3 === 'number' ? current.r3 : 0,
    BP: typeof current.bp === 'number' ? current.bp : (current.sp_max || 1024),
    SP: typeof current.sp === 'number' ? current.sp : (current.sp_max || 1024)
  } : {
    R0: 0,
    R1: 0,
    R2: 0,
    R3: 0,
    BP: 1024,
    SP: 1024
  };

  // STEP 5: Variables - Extract and map variables from trace data
  // Backend sends: {name, addr, val, offset}
  // Component expects: {name, address, value}
  const variables = current?.vars
    ? current.vars.map((v: any) => ({
      name: v.name || 'unknown',
      address: v.addr || (typeof v.offset === 'number' && current.bp ? `0x${(current.bp + v.offset).toString(16).toUpperCase()}` : '0x0'),
      value: typeof v.val === 'number' ? v.val : (typeof v.value === 'number' ? v.value : 0)
    }))
    : [];

  // STEP 3: Stack Frames - Reconstruct call stack dynamically from trace data
  // The VM uses BP (Base Pointer) to track stack frames
  // When a function is called, BP is saved and set to current SP (lower value)
  // When returning, BP is restored (higher value)
  // So: Lower BP = deeper call, Higher BP = caller
  const reconstructCallStack = (): string[] => {
    if (!trace || trace.length === 0 || !current) return [];

    const callStack: string[] = [];
    const currentBP = typeof current.bp === 'number' ? current.bp : null;

    if (currentBP === null) {
      // Fallback: just use current function if BP is not available
      return current.func ? [current.func] : [];
    }

    // Collect all unique BP values and their corresponding functions
    // Map BP -> function name
    const bpToFunc = new Map<number, string>();

    // Scan through trace to build BP -> function mapping
    for (let i = 0; i <= step; i++) {
      const stepData = trace[i];
      if (!stepData || typeof stepData.bp !== 'number' || !stepData.func) continue;

      const stepBP = stepData.bp;
      const stepFunc = stepData.func;

      // Only update if this BP hasn't been seen or if we have a better function name
      if (!bpToFunc.has(stepBP) || stepFunc !== 'unknown') {
        bpToFunc.set(stepBP, stepFunc);
      }
    }

    // Build call stack by finding all BP values >= currentBP (callers)
    // and sorting them (higher BP = caller, lower BP = callee)
    const bps = Array.from(bpToFunc.keys())
      .filter(bp => bp >= currentBP) // Only include current frame and callers
      .sort((a, b) => b - a); // Sort descending (caller first)

    // Build the call stack from BP chain
    for (const bp of bps) {
      const funcName = bpToFunc.get(bp);
      if (funcName && funcName !== 'unknown') {
        // Avoid duplicates
        if (callStack.length === 0 || callStack[callStack.length - 1] !== funcName) {
          callStack.push(funcName);
        }
      }
    }

    // If no call stack found, at least show current function
    if (callStack.length === 0 && current.func && current.func !== 'unknown') {
      callStack.push(current.func);
    }

    return callStack;
  };

  const stackFrames = reconstructCallStack();

  // STEP 2: Execution Stats - Calculate all stats dynamically from trace data
  const calculateRegistersUsed = () => {
    if (!current) return 0;
    let count = 0;
    // Count non-zero registers (R0-R3)
    if (typeof current.r0 === 'number' && current.r0 !== 0) count++;
    if (typeof current.r1 === 'number' && current.r1 !== 0) count++;
    if (typeof current.r2 === 'number' && current.r2 !== 0) count++;
    if (typeof current.r3 === 'number' && current.r3 !== 0) count++;
    // BP and SP are always considered used (they always have values)
    return count + 2;
  };

  const calculateStackDepth = () => {
    if (!current || typeof current.sp_max !== 'number' || typeof current.sp !== 'number') return 0;
    // Stack depth is the number of stack slots used (sp_max - sp)
    // Each slot is typically 4 bytes, so divide by 4 to get depth in elements
    const usedSlots = current.sp_max - current.sp;
    return Math.max(0, Math.floor(usedSlots / 4));
  };

  const calculateStackUsage = () => {
    if (!current || typeof current.sp_max !== 'number' || typeof current.sp !== 'number') return 0;
    if (current.sp_max === 0) return 0;
    const usedBytes = current.sp_max - current.sp;
    const percentage = Math.round((usedBytes / current.sp_max) * 100);
    return Math.min(100, Math.max(0, percentage)); // Clamp between 0-100
  };

  const stats = current ? {
    registersUsed: calculateRegistersUsed(),
    totalRegisters: 6, // Fixed: R0, R1, R2, R3, BP, SP
    instructionCount: step + 1, // Number of instructions executed so far (0-indexed step + 1)
    stackDepth: calculateStackDepth(),
    cycles: typeof current.tick === 'number' ? current.tick : step, // Use tick if available, otherwise use step as cycle count
    heapUsage: 0, // Heap not tracked in current VM implementation
    stackUsage: calculateStackUsage()
  } : {
    registersUsed: 0,
    totalRegisters: 6,
    instructionCount: 0,
    stackDepth: 0,
    cycles: 0,
    heapUsage: 0,
    stackUsage: 0
  };

  const allInstructions = trace && trace.length > 0 ? trace.map(t => t.op || 'UNKNOWN') : []; // This is just Opcode strings for now
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
        {/* STEP 4: Memory Map - Pass dynamic memory data */}
        <MemoryLayout
          stackDepth={current?.sp_max && current?.sp ? current.sp_max - current.sp : 0}
          totalSize={current?.sp_max || 1024}
          sp={typeof current?.sp === 'number' ? current.sp : undefined}
          bp={typeof current?.bp === 'number' ? current.bp : undefined}
          spMax={typeof current?.sp_max === 'number' ? current.sp_max : undefined}
        />
        <div className="flex-1 min-h-[300px]">
          {/* STEP 6: Instruction Timeline - Pass trace data for enhanced display */}
          <InstructionTimeline
            instructions={allInstructions.length > 0 ? allInstructions : []}
            currentIdx={step >= 0 && step < allInstructions.length ? step : 0}
            onStep={onNext}
            onPrevStep={onPrev}
            trace={trace}
          />
        </div>
      </div>
    </div>
  );
};
