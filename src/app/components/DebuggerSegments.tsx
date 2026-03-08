import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Layers, Database, Activity, Clock, Hash } from "lucide-react";
import { Progress } from "./ui/progress";

// --- Registers Panel ---
export const RegisterPanel = ({ registers }: { registers: Record<string, number> }) => {
  return (
    <div className="bg-white/60 dark:bg-[#1a1a2e]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.4)] transition-all hover:shadow-2xl hover:border-pink-500/30">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 text-pink-600 dark:text-pink-500">
          <div className="p-2 bg-pink-100 dark:bg-pink-500/20 rounded-xl">
            <Cpu size={20} />
          </div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">Registers</h3>
        </div>
        <div className="px-2 py-0.5 rounded-full bg-pink-100 dark:bg-pink-500/20 text-[10px] font-bold text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/30">
          32-BIT
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(registers).map(([name, value]) => (
          <motion.div
            key={name}
            layout
            whileHover={{ scale: 1.02, backgroundColor: "rgba(236, 72, 153, 0.05)" }}
            className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-xl px-4 py-3 border border-gray-100 dark:border-white/5 shadow-sm"
          >
            <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{name}</span>
            <AnimatePresence mode="wait">
              <motion.span
                key={value}
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -5, opacity: 0 }}
                className="font-mono text-sm font-bold text-gray-900 dark:text-white"
              >
                {value}
              </motion.span>
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// --- Stack Frames Panel ---
export const StackPanel = ({ stack }: { stack: string[] }) => {
  return (
    <div className="bg-white/60 dark:bg-[#1a1a2e]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 text-purple-600 dark:text-purple-500">
          <div className="p-2 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
            <Layers size={20} />
          </div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">Stack Frames</h3>
        </div>
      </div>
      <div className="space-y-3 max-h-[220px] overflow-y-auto hide-scrollbar pr-1">
        <AnimatePresence initial={false}>
          {stack.length === 0 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400 italic">Stack empty</span>
          ) : (
            stack.map((frame, i) => (
              <motion.div
                key={`${frame}-${i}`}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className={`flex items-center gap-3 p-2 rounded-lg border ${i === 0
                    ? "bg-purple-100 dark:bg-purple-500/20 border-purple-300 dark:border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                    : "bg-gray-100 dark:bg-black/20 border-gray-200 dark:border-white/5"
                  }`}
              >
                <span className="text-[10px] font-mono text-gray-600 dark:text-gray-500">[{stack.length - 1 - i}]</span>
                <span className={`text-xs font-medium ${i === 0 ? "text-purple-700 dark:text-purple-300" : "text-gray-700 dark:text-gray-300"}`}>
                  {frame}
                </span>
              </motion.div>
            )).reverse() // Newest at top
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// --- Variable Memory Table ---
export const VariableTable = ({ variables }: { variables: Array<{ name: string, address: string, value: number }> }) => {
  return (
    <div className="bg-white/60 dark:bg-[#1a1a2e]/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-500">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 rounded-xl">
            <Database size={20} />
          </div>
          <h3 className="font-black uppercase tracking-[0.2em] text-xs">Variables</h3>
        </div>
      </div>
      <div className="overflow-x-auto hide-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-[10px] uppercase text-gray-600 dark:text-gray-500 border-b border-gray-200 dark:border-white/10">
              <th className="pb-2 font-semibold">Name</th>
              <th className="pb-2 font-semibold text-center">Addr</th>
              <th className="pb-2 font-semibold text-right">Value</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {variables.length === 0 ? (
              <tr>
                <td colSpan={3} className="py-4 text-center text-gray-500 dark:text-gray-400 italic">No variables in scope</td>
              </tr>
            ) : (
              variables.map((v, i) => (
                <motion.tr
                  key={v.name + v.address}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-gray-200 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="py-2 font-medium text-gray-700 dark:text-gray-300">{v.name}</td>
                  <td className="py-2 text-center font-mono text-gray-600 dark:text-gray-500">{v.address}</td>
                  <td className="py-2 text-right">
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={v.value}
                        initial={{ scale: 1.2, color: "#ec4899" }}
                        animate={{ scale: 1 }}
                        className="font-mono font-bold text-gray-900 dark:text-white"
                      >
                        {v.value}
                      </motion.span>
                    </AnimatePresence>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Execution Statistics ---
export const ExecutionStats = ({ stats }: { stats: any }) => {
  return (
    <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/20 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-4 text-blue-600 dark:text-blue-500">
        <Activity size={18} />
        <h3 className="font-bold uppercase tracking-wider text-sm">Execution Stats</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-[10px] uppercase font-bold">
            <Cpu size={12} /> Registers Used
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.registersUsed} <span className="text-gray-500 dark:text-gray-400 text-xs font-normal">/ {stats.totalRegisters}</span></p>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-1.5 text-gray-600 dark:text-gray-400 text-[10px] uppercase font-bold">
            <Hash size={12} /> Instructions
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.instructionCount}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400 text-[10px] uppercase font-bold">
            <Layers size={12} /> Stack Depth
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.stackDepth}</p>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-1.5 text-gray-600 dark:text-gray-400 text-[10px] uppercase font-bold">
            <Clock size={12} /> Cycles (Est)
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.cycles}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Stack Usage</span>
            <span className="text-gray-900 dark:text-white font-bold">{stats.stackUsage}%</span>
          </div>
          <Progress value={stats.stackUsage} className="h-1 bg-gray-200 dark:bg-white/10 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.5)]" />
          </Progress>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px]">
            <span className="text-gray-600 dark:text-gray-400 font-medium">Heap Usage</span>
            <span className="text-gray-900 dark:text-white font-bold">{stats.heapUsage}%</span>
          </div>
          <Progress value={stats.heapUsage} className="h-1 bg-gray-200 dark:bg-white/10" />
        </div>
      </div>
    </div>
  );
};
