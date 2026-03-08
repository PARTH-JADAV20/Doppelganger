import { useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useGitHubStore } from "../../store/githubStore";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { API_URL } from "../utils/api";

interface GitHubPushButtonProps {
  currentFile: string;
  code: string;
  onCodeSaved: () => void;
}

export function GitHubPushButton({ currentFile, code, onCodeSaved }: GitHubPushButtonProps) {
  const { isConnected, sessionId, selectedRepo, trackedFiles, trackFile } = useGitHubStore();
  const [isOpen, setIsOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState(`Add ${currentFile.split("/").pop()} from VoltC IDE`);
  const [isPushing, setIsPushing] = useState(false);

  const trackedFile = trackedFiles[currentFile];
  const isModified = trackedFile?.isModified;
  const isCFile = currentFile.endsWith('.c');
  const isUntracked = !trackedFile;

  // Show push button only if connected and a repo is selected and it's a C file
  if (!isConnected || !selectedRepo || !isCFile) return null;

  // Can push if it's modified and tracked, OR if it's untracked
  const canPush = isModified || isUntracked;

  const handlePush = async () => {
    if (!commitMessage.trim()) return;
    setIsPushing(true);

    try {
      const [owner, repo] = selectedRepo.split('/');
      
      const payload: any = {
        owner,
        repo,
        path: currentFile,
        content: code,
        message: commitMessage
      };

      if (trackedFile?.sha) {
        payload.sha = trackedFile.sha;
      }
      
      const res = await fetch(`${API_URL}/github/push`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-session-id": sessionId || ""
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(isUntracked 
          ? `File created on GitHub successfully.` 
          : `Changes pushed to GitHub successfully.`);
        
        // Update track file with new SHA and mark as unmodified
        trackFile(currentFile, data.newSha, code);
        onCodeSaved(); // Notify IDE that we consider this "saved"
        setIsOpen(false);
      } else {
        toast.error(data.error || "Failed to push to GitHub. Does the file already exist?");
      }
    } catch (error) {
      toast.error("Network error attempting to push to GitHub.");
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={!canPush}
        className={`border-indigo-500/30 text-indigo-600 dark:text-indigo-400 font-medium tracking-wide shadow-sm hover:shadow-indigo-500/20 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 ${!canPush ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
        onClick={() => {
            setCommitMessage(isUntracked ? `Add ${currentFile.split("/").pop()} to GitHub` : `Update ${currentFile.split("/").pop()} via VoltC`);
            setIsOpen(true);
        }}
      >
        <UploadCloud className="w-4 h-4 mr-2" />
        {isUntracked ? 'Push New File' : 'Push to GitHub'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isUntracked ? 'Push New File to GitHub' : 'Push Changes'}</DialogTitle>
            <DialogDescription>
              {isUntracked 
                ? <>Creating <strong>{currentFile}</strong> in <strong>{selectedRepo}</strong></>
                : <>Committing changes for <strong>{currentFile}</strong> to <strong>{selectedRepo}</strong></>
              }
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2 py-4">
            <div className="grid flex-1 gap-2">
              <label htmlFor="commitMsg" className="text-sm font-medium">Commit Message</label>
              <Input
                id="commitMsg"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handlePush()}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isPushing}>
              Cancel
            </Button>
            <Button 
              onClick={handlePush} 
              disabled={isPushing || !commitMessage.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isPushing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isUntracked ? 'Push New File' : 'Commit & Push'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
