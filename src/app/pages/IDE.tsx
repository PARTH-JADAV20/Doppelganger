/**
 * Real-Time C Compiler IDE
 * 
 * This is a frontend-only IDE interface with mock compilation functionality.
 * Backend APIs for actual C compilation will be integrated later.
 * 
 * Features:
 * - Monaco Editor with C syntax highlighting
 * - File explorer with file/folder creation and save to localStorage
 * - Mock compilation with output and assembly display
 * - Memory visualization with animated progress bars
 * - Dark/Light mode toggle
 * - Keyboard shortcuts (Ctrl+Enter to compile, Ctrl+S to save)
 * - Glassmorphism UI with pink-purple-indigo gradient theme
 * - Resizable panels for flexible layout
 * - Collapsible sidebar
 * - Auto-show output on compile/run
 * 
 * Backend Integration Points:
 * - handleCompile(): Replace mock compilation with API call to backend compiler
 * - handleRun(): Replace mock execution with API call to run compiled code
 * - File system: Replace localStorage with backend file system
 * - memoryStats: Fetch actual memory usage from compilation backend
 */

import { useState, useEffect, useRef } from "react";
import { PanelLeft } from "lucide-react";
import { Navbar } from "../components/Navbar";
import { Sidebar } from "../components/Sidebar";
import { Editor } from "../components/Editor";
import { OutputPanel } from "../components/OutputPanel";
import { StatusBar } from "../components/StatusBar";
import { Button } from "../components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip";
import {
  PanelGroup,
  Panel,
  PanelResizeHandle,
} from "react-resizable-panels";
import { toast } from "sonner";
import { FileItem } from "../types/ide";

export type { FileItem };

// Default starter files
const defaultFiles: Record<string, string> = {
  "src/main.c": `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}`,
  "examples/fibonacci.c": `int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    int n = 10;
    printf("Fibonacci recursion demo\\n");
    printf("Calculating fib(10)...\\n");
    printf("Result: %d\\n", fibonacci(n));
    return 0;
}`,
  "examples/arithmetic.c": `int main() {
    int a = 12;
    int b = 4;
    printf("Arithmetic Demo:\\n");
    printf("a = 12, b = 4\\n");
    printf("a + b = %d\\n", a + b);
    printf("a - b = %d\\n", a - b);
    printf("a * b = %d\\n", a * b);
    printf("a / b = %d\\n", a / b);
    return 0;
}`,
  "examples/loops.c": `#include <stdio.h>

int main() {
    // For loop example
    printf("For loop:\\n");
    for (int i = 1; i <= 5; i++) {
        printf("%d ", i);
    }
    
    // While loop example
    printf("\\n\\nWhile loop:\\n");
    int j = 1;
    while (j <= 5) {
        printf("%d ", j);
        j = j + 1;
    }
    printf("\\n");
    
    return 0;
}`,
};

const sampleAssembly = `; Assembly Output (Custom ISA)
SECTION .text
    global main

main:
    PUSH RBP
    MOV RBP, RSP
    SUB RSP, 16
    
    MOV DWORD [RBP-4], 10
    MOV EAX, [RBP-4]
    MOV EDI, EAX
    CALL fibonacci
    
    MOV ESI, EAX
    LEA RDI, [format]
    MOV EAX, 0
    CALL printf
    
    MOV EAX, 0
    LEAVE
    RET

fibonacci:
    PUSH RBP
    MOV RBP, RSP
    SUB RSP, 16
    MOV DWORD [RBP-4], EDI
    
    CMP DWORD [RBP-4], 1
    JG .L2
    MOV EAX, [RBP-4]
    JMP .L3
    
.L2:
    MOV EAX, [RBP-4]
    SUB EAX, 1
    MOV EDI, EAX
    CALL fibonacci
    MOV EBX, EAX
    
    MOV EAX, [RBP-4]
    SUB EAX, 2
    MOV EDI, EAX
    CALL fibonacci
    ADD EAX, EBX
    
.L3:
    LEAVE
    RET

SECTION .data
    format: db "Fibonacci: %d", 10, 0`;

// Build file tree from flat file structure
function buildFileTree(files: Record<string, string>): FileItem[] {
  const tree: FileItem[] = [];
  const folderMap: Record<string, FileItem> = {};

  // Sort paths to ensure folders are created before files
  const sortedPaths = Object.keys(files).sort();

  sortedPaths.forEach((path) => {
    const parts = path.split("/");
    let currentPath = "";

    parts.forEach((part, index) => {
      const isLast = index === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (isLast) {
        // It's a file
        const file: FileItem = {
          name: part,
          type: "file",
          path: currentPath,
        };

        if (parts.length === 1) {
          tree.push(file);
        } else {
          const parentPath = parts.slice(0, -1).join("/");
          const parent = folderMap[parentPath];
          if (parent && parent.children) {
            parent.children.push(file);
          }
        }
      } else {
        // It's a folder
        if (!folderMap[currentPath]) {
          const folder: FileItem = {
            name: part,
            type: "folder",
            path: currentPath,
            children: [],
          };
          folderMap[currentPath] = folder;

          if (index === 0) {
            tree.push(folder);
          } else {
            const parentPath = parts.slice(0, index).join("/");
            const parent = folderMap[parentPath];
            if (parent && parent.children) {
              parent.children.push(folder);
            }
          }
        }
      }
    });
  });

  return tree;
}

export function IDE() {
  const [files, setFiles] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("c-compiler-files");
    if (!saved) return defaultFiles;

    // Merge logic: ensure new default examples are added to existing ones
    const savedFiles = JSON.parse(saved);
    const merged = { ...defaultFiles, ...savedFiles };
    
    // Cleanup: remove the old redundant recursive example name if it exists
    if (merged["examples/fibonacci_recursive.c"]) {
      delete merged["examples/fibonacci_recursive.c"];
    }
    
    return merged;
  });
  const [fileTree, setFileTree] = useState<FileItem[]>(() => buildFileTree(files));
  const [currentFile, setCurrentFile] = useState("src/main.c");
  const [code, setCode] = useState(files["src/main.c"] || "");
  const [output, setOutput] = useState("");
  const [assembly, setAssembly] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileStatus, setCompileStatus] = useState<"idle" | "compiling" | "success" | "error">("idle");
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [activeTab, setActiveTab] = useState("output");
  const [memoryStats, setMemoryStats] = useState({
    stackUsage: 0,
    heapUsage: 0,
    registersUsed: 0,
    instructionCount: 0,
  });
  const [debugTrace, setDebugTrace] = useState<any[]>([]);
  const [debugStep, setDebugStep] = useState(0);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const editorRef = useRef<any>(null);

  // Save files to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("c-compiler-files", JSON.stringify(files));
    setFileTree(buildFileTree(files));
  }, [files]);

  // Track unsaved changes and auto-save
  useEffect(() => {
    if (files[currentFile] !== code) {
      setHasUnsavedChanges(true);

      const timer = setTimeout(() => {
        setFiles(prev => ({ ...prev, [currentFile]: code }));
        setHasUnsavedChanges(false);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [code, currentFile, files]);

  const handleFileSelect = (filePath: string) => {
    setCurrentFile(filePath);
    setCode(files[filePath] || "");
    setOutput("");
    setAssembly("");
    setCompileStatus("idle");
  };

  const handleSaveFile = (filePath: string) => {
    const updatedFiles = { ...files, [filePath]: code };
    setFiles(updatedFiles);
    setHasUnsavedChanges(false);
  };

  const handleCreateFile = (parentPath: string, fileName: string) => {
    // Enforce .c extension by default if not present
    let finalName = fileName;
    if (!finalName.toLowerCase().endsWith('.c') && !finalName.includes('.')) {
      finalName = finalName + '.c';
    }

    // Strict validation: No other extensions allowed except .c
    if (!finalName.toLowerCase().endsWith('.c')) {
      toast.error("Only .c files are allowed in VoltC!");
      return;
    }

    const newPath = parentPath ? `${parentPath}/${finalName}` : finalName;

    if (files[newPath]) {
      toast.error("File already exists!");
      return;
    }

    const updatedFiles = { ...files, [newPath]: "" };
    setFiles(updatedFiles);
    setCurrentFile(newPath);
    setCode("");
    toast.success(`Created ${newPath}`);
  };

  const handleCreateFolder = (parentPath: string, folderName: string) => {
    const newPath = parentPath ? `${parentPath}/${folderName}` : folderName;

    // Check if folder already exists
    const folderExists = Object.keys(files).some(path => path.startsWith(newPath + "/"));
    if (folderExists) {
      toast.error("Folder already exists!");
      return;
    }

    // Create a placeholder file in the folder to represent it
    const placeholderPath = `${newPath}/.gitkeep`;
    const updatedFiles = { ...files, [placeholderPath]: "" };
    setFiles(updatedFiles);
    toast.success(`Created folder ${newPath}`);
  };

  const handleDeleteFile = (filePath: string) => {
    const updatedFiles = { ...files };

    // Check if it's a folder (delete all files within it)
    const isFolder = Object.keys(updatedFiles).some(path =>
      path !== filePath && path.startsWith(filePath + "/")
    );

    if (isFolder) {
      // Delete all files in this folder
      Object.keys(updatedFiles).forEach(path => {
        if (path.startsWith(filePath + "/") || path === filePath) {
          delete updatedFiles[path];
        }
      });
    } else {
      // Delete single file
      delete updatedFiles[filePath];
    }

    setFiles(updatedFiles);

    // If current file was deleted, switch to main.c
    if (currentFile === filePath || currentFile.startsWith(filePath + "/")) {
      setCurrentFile("src/main.c");
      setCode(updatedFiles["src/main.c"] || "");
    }

    toast.success(`Deleted ${filePath}`);
  };

  const handleDownloadFile = (filePath: string) => {
    const content = files[filePath] || "";
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filePath.split("/").pop() || "file.c";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filePath}`);
  };

  const handleCompile = async () => {
    setIsCompiling(true);
    setCompileStatus("compiling");
    setOutput("Compiling...\n");
    setActiveTab("output");
    setIsDebugMode(false);

    try {
      const res = await fetch("http://localhost:3001/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code })
      });
      const data = await res.json();

      setIsCompiling(false);
      if (data.success) {
        setCompileStatus("success");
        setOutput(
          `Compilation successful!\n\nCompiler: ${data.stats.compiler}\nTarget: ${data.stats.target}\n\n[INFO] Binary size: ${data.stats.binarySize} bytes\n`
        );
        setAssembly(data.assembly);

        // Count instructions roughly based on line count of assembly
        const lines = data.assembly.split('\n').filter((l: string) => l.trim() && !l.includes(':')).length;
        setMemoryStats(prev => ({
          ...prev,
          instructionCount: lines
        }));
      } else {
        setCompileStatus("error");
        setOutput(`Compilation Error:\n\n${data.error}`);
        setAssembly("");
      }
    } catch (err) {
      setIsCompiling(false);
      setCompileStatus("error");
      setOutput(`Failed to connect to Compiler backend.\nEnsure the server is running on port 3001.`);
    }
  };

  const handleRun = async () => {
    if (compileStatus !== "success") {
      setOutput("Please compile the code first before running.");
      setActiveTab("output");
      return;
    }

    setActiveTab("output");
    setOutput("Executing...\n");
    setIsDebugMode(false);

    try {
      const res = await fetch("http://localhost:3001/run", { method: "POST" });
      const data = await res.json();

      if (data.success) {
        setOutput(`=== Program Output ===\n${data.output}\n\n=== Program Finished ===\nExecution time: ${data.execTime}ms\nExit code: ${data.exitCode}`);
        if (data.finalState) {
          updateStatsFromTrace(data.finalState);
        }
      } else {
        setOutput(`Execution Error:\n\n${data.error || "Unknown error"}`);
      }
    } catch (err) {
      setOutput(`Failed to connect to Compiler backend.`);
    }
  };

  const handleDebug = async () => {
    if (compileStatus !== "success") {
      setOutput("Please compile the code first before debugging.");
      setActiveTab("output");
      return;
    }

    setOutput("Starting debugger...\n");
    try {
      const res = await fetch("http://localhost:3001/debug", { method: "POST" });
      const data = await res.json();

      if (data.success && data.trace) {
        setDebugTrace(data.trace);
        setDebugStep(0);
        setIsDebugMode(true);
        setActiveTab("memory");
        updateStatsFromTrace(data.trace[0]);
      } else {
        setOutput(`Debugger Error:\n\n${data.error || "Failed to load trace"}`);
        setActiveTab("output");
      }
    } catch (err) {
      setOutput(`Failed to start debugger sequence.`);
      setActiveTab("output");
    }
  };

  const updateStatsFromTrace = (step: any) => {
    if (!step) return;
    const stackUsedBytes = step.sp_max - step.sp;
    const stackUsage = stackUsedBytes > 0 ? Math.max(1, Math.round((stackUsedBytes / step.sp_max) * 100)) : 0;

    setMemoryStats(prev => ({
      ...prev,
      stackUsage,
      registersUsed: (step.r0 !== 0 ? 1 : 0) +
        (step.r1 !== 0 ? 1 : 0) +
        (step.r2 !== 0 ? 1 : 0) +
        (step.r3 !== 0 ? 1 : 0) + 2 // BP and SP are always considered "used"
    }));
  };

  const handleDebugNext = () => {
    if (debugStep < debugTrace.length - 1) {
      const next = debugStep + 1;
      setDebugStep(next);
      updateStatsFromTrace(debugTrace[next]);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to compile
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!isCompiling) {
          handleCompile();
        }
      }
      // Ctrl+S or Cmd+S to save (manual save fallback)
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile(currentFile);
        toast.success(`Saved ${currentFile}`);
      }
      // Ctrl+B or Cmd+B to toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        setIsSidebarVisible((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCompiling, currentFile, code]);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-[#0b0b12] dark:via-[#111122] dark:to-[#16162b]">
      <Navbar
        currentFile={currentFile}
        onCompile={handleCompile}
        onRun={handleRun}
        onDebug={handleDebug}
        isCompiling={isCompiling}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      <div className="flex-1 min-h-0 flex overflow-hidden">
        <Sidebar
          currentFile={currentFile}
          onFileSelect={handleFileSelect}
          onSaveFile={handleSaveFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteFile={handleDeleteFile}
          onDownloadFile={handleDownloadFile}
          fileTree={fileTree}
          isVisible={isSidebarVisible}
        />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Toggle Sidebar Button */}
          <div className="px-4 pt-4 pb-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                    className="hover:bg-white/10 dark:hover:bg-white/10 rounded-lg"
                  >
                    <PanelLeft className="w-4 h-4 mr-2" />
                    {isSidebarVisible ? "Hide" : "Show"} Explorer
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Toggle File Explorer (Ctrl+B)
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Resizable Panels */}
          <div className="flex-1 min-h-0 p-4 pt-2">
            <PanelGroup direction="horizontal" className="h-full">
              {/* Editor Panel */}
              <Panel defaultSize={60} minSize={30}>
                <div className="h-full pr-2 pl-1 py-1">
                  <Editor
                    code={code}
                    filePath={currentFile}
                    onChange={(value) => setCode(value || "")}
                    onCursorChange={(line, column) => setCursorPosition({ line, column })}
                    onMount={(editor) => {
                      editorRef.current = editor;
                    }}
                  />
                </div>
              </Panel>

              <PanelResizeHandle className="w-1 bg-black/10 dark:bg-white/10 hover:bg-purple-500/50 dark:hover:bg-purple-500/50 transition-colors rounded-full mx-2" />

              {/* Output Panel */}
              <Panel defaultSize={40} minSize={25}>
                <div className="h-full pl-2 pr-1 py-1 flex flex-col min-h-0">
                  <OutputPanel
                    output={output}
                    assembly={assembly}
                    memoryStats={memoryStats}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isDebugMode={isDebugMode}
                    debugStep={debugStep}
                    debugTrace={debugTrace}
                    onDebugNext={handleDebugNext}
                  />
                </div>
              </Panel>
            </PanelGroup>
          </div>
        </div>
      </div>

      <StatusBar
        language="C"
        compiler="GCC"
        targetISA="Custom"
        cursorPosition={cursorPosition}
        compileStatus={compileStatus}
      />
    </div>
  );
}