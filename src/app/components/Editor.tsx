import MonacoEditor, { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { motion } from "motion/react";
import { Loader2, AlignLeft } from "lucide-react";
import { useEffect, useRef } from "react";
import { checkCSyntax } from "../utils/c-syntax-checker";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { toast } from "sonner";

interface EditorProps {
  code: string;
  filePath: string;
  onChange: (value: string | undefined) => void;
  onCursorChange: (line: number, column: number) => void;
  onMount?: (editor: any) => void;
  onFormat?: (code: string) => string;
}

export function Editor({ code, filePath, onChange, onCursorChange, onMount, onFormat }: EditorProps) {
  const { theme } = useTheme();
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const modelRef = useRef<Record<string, any>>({});

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Set up cursor position tracking
    editor.onDidChangeCursorPosition((e) => {
      onCursorChange(e.position.lineNumber, e.position.column);
    });

    // Add format action to editor
    if (onFormat) {
      editor.addAction({
        id: 'custom.formatCode',
        label: '📝 Format Code',
        keybindings: [
          monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF
        ],
        precondition: undefined,
        keybindingContext: undefined,
        contextMenuGroupId: 'navigation',
        contextMenuOrder: 1.5,
        run: (ed: any) => {
          const currentCode = ed.getValue();
          const formattedCode = onFormat(currentCode);
          if (formattedCode !== currentCode) {
            const position = ed.getPosition();
            ed.executeEdits('', [{
              range: ed.getModel().getFullModelRange(),
              text: formattedCode
            }]);
            ed.setPosition(position);
          }
        }
      });
    }

    if (onMount) {
      onMount(editor);
    }
  };

  // Handle file switching with proper model management
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    // Get or create model for this file
    let model = modelRef.current[filePath];

    if (!model) {
      // Create new model for this file
      model = monaco.editor.createModel(code, "c", monaco.Uri.file(filePath));
      modelRef.current[filePath] = model;

      // Listen to model changes
      model.onDidChangeContent(() => {
        onChange(model.getValue());
      });
    } else {
      // Update existing model if code changed externally (e.g., from localStorage)
      const currentValue = model.getValue();
      if (currentValue !== code) {
        model.setValue(code);
      }
    }

    // Switch to this file's model
    editor.setModel(model);
  }, [filePath]);

  // Real-time syntax checking with debouncing
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const monaco = monacoRef.current;
    const model = modelRef.current[filePath];
    if (!model) return;

    const timer = setTimeout(() => {
      const errors = checkCSyntax(code);
      const markers = errors.map(err => ({
        startLineNumber: err.line,
        startColumn: err.column - 1,
        endLineNumber: err.line,
        endColumn: err.column,
        message: err.message,
        severity: err.severity === 'Error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning
      }));

      monaco.editor.setModelMarkers(model, "c-linter", markers);
    }, 500);

    return () => clearTimeout(timer);
  }, [code, filePath]);

  useEffect(() => {
    if (!editorRef.current) return;

    const model = modelRef.current[filePath];
    if (model) {
      const currentValue = model.getValue();
      // Only update if the change came from outside the editor
      if (currentValue !== code && document.activeElement !== editorRef.current.getDomNode()) {
        model.setValue(code);
      }
    }
  }, [code, filePath]);

  const handleFormatClick = () => {
    if (!onFormat || !editorRef.current) return;
    const currentCode = editorRef.current.getValue();
    const formattedCode = onFormat(currentCode);
    if (formattedCode !== currentCode) {
      const position = editorRef.current.getPosition();
      editorRef.current.executeEdits('', [{
        range: editorRef.current.getModel().getFullModelRange(),
        text: formattedCode
      }]);
      editorRef.current.setPosition(position);
      toast.success("Code formatted");
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.98, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="h-full rounded-2xl overflow-hidden border border-black/5 dark:border-white/10 bg-white/40 dark:bg-[#16162b]/30 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] relative"
    >
      {onFormat && (
        <div className="absolute top-2 right-2 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleFormatClick}
                  variant="outline"
                  size="sm"
                  className="border-white/10 hover:bg-white/5 bg-white/80 dark:bg-[#16162b]/80 backdrop-blur-sm rounded-lg h-7 px-2 text-[11px] font-medium shadow-sm"
                >
                  <AlignLeft className="w-3.5 h-3.5 mr-1" />
                  Format
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px]">
                Format Code (Shift+Alt+F)
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <MonacoEditor
        height="100%"
        defaultLanguage="c"
        value={code}
        onChange={onChange}
        theme={theme === "dark" ? "vs-dark" : "light"}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Loading editor...</p>
            </div>
          </div>
        }
        options={{
          fontSize: 14,
          fontFamily: "'Fira Code', 'Cascadia Code', 'Monaco', monospace",
          minimap: { enabled: true },
          scrollbar: {
            vertical: 'hidden',
            horizontal: 'hidden',
            useShadows: false,
            verticalHasArrows: false,
            horizontalHasArrows: false,
          },
          scrollBeyondLastLine: false,
          lineNumbers: "on",
          renderWhitespace: "selection",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 16, bottom: 16 },
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 3,
          glyphMargin: false,
          folding: true,
          automaticLayout: true,
        }}
        onMount={handleEditorDidMount}
      />
    </motion.div>
  );
}