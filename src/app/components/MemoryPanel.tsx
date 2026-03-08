import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Play, SkipForward, ArrowRight, Layers, Database, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { RegisterPanel, StackPanel, VariableTable, ExecutionStats } from "./DebuggerSegments";

// --- Instruction Timeline Panel ---
// STEP 6: Instruction Timeline - Enhanced to show dynamic trace information
export const InstructionTimeline = ({
  instructions,
  currentIdx,
  onStep,
  onPrevStep,
  onJump,
  trace
}: {
  instructions: string[],
  currentIdx: number,
  onStep?: () => void,
  onPrevStep?: () => void,
  onJump?: (stepIndex: number) => void,
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
                onClick={() => onJump && onJump(i)}
                className={`flex items-start gap-2 p-2 rounded-lg border font-mono text-xs transition-all cursor-pointer group/item ${isActive
                  ? "bg-green-100 dark:bg-green-500/20 border-green-300 dark:border-green-500/50 text-green-800 dark:text-green-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                  : "border-transparent text-gray-600 dark:text-gray-400 opacity-60 hover:opacity-100 hover:bg-white/10"
                  }`}
              >
                <span className="w-8 text-right text-[10px] opacity-60 shrink-0 pt-0.5">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold group-hover/item:text-green-500 transition-colors">{inst}</span>
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

// --- Sticky Control Bar ---
const MemoryControls = ({ 
  step, 
  total, 
  onNext, 
  onPrev, 
  onReset,
  current
}: { 
  step: number, 
  total: number, 
  onNext?: () => void, 
  onPrev?: () => void,
  onReset?: () => void,
  current?: any
}) => {
  return (
    <div className="sticky top-0 z-20 bg-white/60 dark:bg-[#0b0b12]/80 backdrop-blur-xl border-b border-black/5 dark:border-white/10 px-4 py-2 flex items-center justify-between mb-4 -mx-2 mt-[-8px]">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onPrev} 
            disabled={step <= 0}
            className="h-8 w-8 rounded-lg hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </Button>
          
          <div className="flex flex-col items-center px-4 min-w-[120px]">
            <span className="text-[10px] uppercase tracking-widest font-black text-gray-400 dark:text-gray-500 leading-none mb-1">Step</span>
            <div className="flex items-center gap-1.5">
               <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{step + 1}</span>
               <span className="text-xs text-gray-400 dark:text-gray-600">/</span>
               <span className="text-xs font-medium text-gray-400 dark:text-gray-600">{total}</span>
            </div>
          </div>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onNext} 
            disabled={step >= total - 1}
            className="h-8 w-8 rounded-lg hover:bg-green-500/10 text-green-600 dark:text-green-400 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </Button>
        </div>

        {current && (
          <div className="flex items-center gap-4 pl-4 border-l border-black/5 dark:border-white/10">
            <div className="flex flex-col pr-2">
              <span className="text-[9px] uppercase font-bold text-gray-400 leading-none mb-1">Instruction</span>
              <span className="text-base font-black text-green-600 dark:text-green-500 tracking-tighter leading-none uppercase font-mono">
                {current.op || 'NOP'}
              </span>
            </div>
            
            <div className="hidden md:flex items-center gap-4 border-l border-black/5 dark:border-white/10 pl-4">
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-gray-400">PC</span>
                <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">{current.pc ?? 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-gray-400">Tick</span>
                <span className="text-xs font-mono font-bold text-orange-600 dark:text-orange-400">{current.tick ?? 0}</span>
              </div>
              {current.func && current.func !== 'unknown' && (
                <div className="flex flex-col">
                  <span className="text-[9px] uppercase font-bold text-gray-400">Function</span>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate max-w-[80px]">@{current.func}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button 
            variant="outline" 
            size="sm" 
            onClick={onReset}
            className="h-8 px-3 text-[11px] font-bold border-white/10 hover:bg-orange-500/10 text-orange-400 rounded-lg flex items-center gap-1.5"
        >
          <RotateCcw size={14} />
          RESET
        </Button>
      </div>
    </div>
  );
};

import { Button } from "./ui/button";

// --- Main Memory Panel Container ---
export const MemoryPanel = ({
  trace,
  step,
  onNext,
  onPrev,
  onJump
}: {
  trace: any[],
  step: number,
  onNext?: () => void,
  onPrev?: () => void,
  onJump?: (stepIndex: number) => void
}) => {
  const handleReset = () => {
    if (onJump) onJump(0);
  };

  // Get current step data from trace, or use empty state if no trace
  const current = trace && trace.length > 0 && step >= 0 && step < trace.length
    ? trace[step]
    : null;

  // Process trace into component-friendly data
  // STEP 1: Registers - Extract real register values from trace data (handle various possible keys)
  const getReg = (key: string) => {
    if (!current) return 0;
    const lower = key.toLowerCase();
    const upper = key.toUpperCase();
    return typeof current[lower] === 'number' ? current[lower] : 
           (typeof current[upper] === 'number' ? current[upper] : 0);
  };

  const registers = current ? {
    EAX: getReg('EAX') || getReg('R0') || getReg('rax'),
    EBX: getReg('EBX') || getReg('R1') || getReg('rbx'),
    ECX: getReg('ECX') || getReg('R2') || getReg('rcx'),
    EDX: getReg('EDX') || getReg('R3') || getReg('rdx'),
    EDI: getReg('EDI') || getReg('esi'), // Sometimes swapped or simple names used
    ESI: getReg('ESI') || getReg('edi'),
    BP: typeof current.bp === 'number' ? current.bp : 
        (typeof current.BP === 'number' ? current.BP : 
         (typeof current.ebp === 'number' ? current.ebp : 
          (typeof current.RBP === 'number' ? current.RBP : (current.sp_max || 1024)))),
    SP: typeof current.sp === 'number' ? current.sp : 
        (typeof current.SP === 'number' ? current.SP : 
         (typeof current.esp === 'number' ? current.esp : 
          (typeof current.RSP === 'number' ? current.RSP : (current.sp_max || 1024))))
  } : {
    EAX: 0, EBX: 0, ECX: 0, EDX: 0, EDI: 0, ESI: 0, BP: 1024, SP: 1024
  };

  // STEP 5: Variables - Extract and map variables from trace data
  const getVariables = () => {
    if (!trace || trace.length === 0 || step < 0) return [];
    
    // Search for variables object/array in current or previous steps
    let rawVars: any = null;
    
    // Look back to find the most RECENT step that has NON-EMPTY variables
    for (let i = Math.min(step, trace.length - 1); i >= 0; i--) {
      const s = trace[i];
      if (!s) continue;
      const v = s.vars || s.Variables || s.VariablesList || s.variables || 
                s.locals || s.localsList || s.locals_list || 
                s.globals || s.globalsList || s.globals_list ||
                s.env || s.frame || s.members || s.data;
      
      // Found something? Only break if it's not empty!
      if (v) {
          if (Array.isArray(v) && v.length > 0) {
              rawVars = v;
              break;
          } else if (typeof v === 'object' && Object.keys(v).length > 0) {
              rawVars = v;
              break;
          }
      }
    }

    if (!rawVars) return [];

    // Handle Array format: [{name, val}, ...]
    if (Array.isArray(rawVars)) {
      return (rawVars as any[]).map((v: any) => {
        const name = v.name || v.Name || v.var || 'var';
        const value = typeof v.val === 'number' ? v.val : (typeof v.value === 'number' ? v.value : (typeof v.Value === 'number' ? v.Value : 0));
        let address = v.addr || v.Address || v.address || v.offset || v.Offset;
        
        if (typeof address === 'number') {
            const bp = typeof current.bp === 'number' ? current.bp : 
                      (typeof current.ebp === 'number' ? current.ebp : 
                      (typeof current.BP === 'number' ? current.BP : 0));
            // Format address
            if (address < 2048 && address > -2048) { 
                address = `0x${(bp + address).toString(16).toUpperCase()}`;
            } else {
                address = `0x${address.toString(16).toUpperCase()}`;
            }
        }
        return { name, address: String(address), value };
      });
    } 
    
    // Handle Object/Map format: {"a": 10, "b": 20}
    if (typeof rawVars === 'object') {
      return Object.entries(rawVars).map(([name, value]) => ({
        name,
        address: 'N/A', // Objects don't usually include addresses in this format
        value: typeof value === 'number' ? value : 0
      }));
    }

    return [];
  };

  const variables = getVariables();
  console.log("TRACE STEP:", current);
  console.log("VARS:", current?.vars);

  // STEP 3: Stack Frames - use server-emitted callStack for accuracy
  const reconstructCallStack = (): string[] => {
    if (!current) return [];

    // Server now emits callStack directly on each step
    if (Array.isArray(current.callStack) && current.callStack.length > 0) {
      return [...current.callStack];
    }

    // Fallback: use func name alone
    const funcName = current.func && current.func !== 'unknown' ? current.func : 'main';
    return [funcName];
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
    totalRegisters: 8, // Count: EAX, EBX, ECX, EDX, EDI, ESI, BP, SP
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
    <div className="w-full p-1 pb-10 relative">
      <MemoryControls 
        step={step} 
        total={trace.length} 
        onNext={onNext} 
        onPrev={onPrev} 
        onReset={handleReset}
        current={current}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            onJump={onJump}
            trace={trace}
          />
        </div>
      </div>
      </div>
    </div>
  );
};
