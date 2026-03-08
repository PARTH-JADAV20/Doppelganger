import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { useGitHubStore } from "../../store/githubStore";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { githubFetch } from "../utils/api";

interface FileImportDialogProps {
  repo: any;
  isOpen: boolean;
  onClose: () => void;
  onImport: (files: { path: string; content: string; sha: string }[]) => void;
}

export function FileImportDialog({ repo, isOpen, onClose, onImport }: FileImportDialogProps) {
  const { sessionId } = useGitHubStore();
  const [files, setFiles] = useState<{ path: string; sha: string; size: number }[]>([]);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (isOpen && repo) {
      fetchRepoFiles();
    } else {
      setFiles([]);
      setSelectedPaths(new Set());
      setErrorMsg("");
    }
  }, [isOpen, repo]);

  const fetchRepoFiles = async () => {
    setIsLoading(true);
    setErrorMsg("");
    try {
      const res = await githubFetch(`/github/repo-files?owner=${repo.owner.login}&repo=${repo.name}&branch=${repo.default_branch}`, sessionId);
      const data = await res.json();
      
      if (data.success) {
        if (data.files.length === 0) {
          setErrorMsg("Empty repository. You can now push your current .c file to this repository using the 'Push to GitHub' button in the toolbar.");
        }
        setFiles(data.files);
      } else {
        setErrorMsg(data.error || "Failed to fetch files.");
      }
    } catch (error) {
      // Error already handled by githubFetch
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (path: string) => {
    const newSelected = new Set(selectedPaths);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      if (newSelected.size >= 20) {
        toast.error("Max 20 files allowed per import.");
        return;
      }
      const file = files.find(f => f.path === path);
      if (file && file.size > 102400) { // 100KB limits
        toast.error(`File ${path} exceeds 100KB limit.`);
        return;
      }
      newSelected.add(path);
    }
    setSelectedPaths(newSelected);
  };

  const handleImport = async () => {
    if (selectedPaths.size === 0) return;
    setIsImporting(true);

    try {
      const importedData: { path: string; content: string; sha: string }[] = [];
      
      // Fetch contents one by one
      for (const path of selectedPaths) {
        const res = await githubFetch(`/github/file-content?owner=${repo.owner.login}&repo=${repo.name}&path=${encodeURIComponent(path)}`, sessionId);
        const data = await res.json();
        
        if (data.success) {
          importedData.push({
            path,
            content: data.content,
            sha: data.sha
          });
        } else {
          toast.error(`Failed to import ${path}`);
        }
      }

      onImport(importedData);
      onClose();
    } catch (e) {
      toast.error("Network error during file import.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Import Files from {repo?.name}</DialogTitle>
          <DialogDescription>
            Select up to 20 .c files to import. (Max 100KB per file)
          </DialogDescription>
        </DialogHeader>

        {!isLoading && !errorMsg && files.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 p-2 rounded-md mb-2">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium text-center">
              Select files to import, or close this if you just want to push your current code to this repo.
            </p>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto mt-2 space-y-2 pr-2 custom-horizontal-scroll border rounded-md p-2 border-gray-200 dark:border-gray-800">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
            </div>
          ) : errorMsg ? (
            <p className={`text-center text-sm py-8 px-4 ${errorMsg.startsWith("Empty repository") ? "text-blue-500 font-medium" : "text-red-500"}`}>
              {errorMsg}
            </p>
          ) : (
            files.map((file) => (
              <div key={file.path} className="flex items-center space-x-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                <Checkbox 
                  id={`chk-${file.path}`} 
                  checked={selectedPaths.has(file.path)}
                  onCheckedChange={() => handleToggle(file.path)}
                  disabled={isImporting}
                />
                <label 
                  htmlFor={`chk-${file.path}`}
                  className="text-sm font-medium leading-none cursor-pointer flex-1 break-all"
                >
                  {file.path}
                </label>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ))
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isImporting}>Cancel</Button>
          <Button 
            onClick={handleImport} 
            disabled={selectedPaths.size === 0 || isImporting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Import {selectedPaths.size} Files
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
