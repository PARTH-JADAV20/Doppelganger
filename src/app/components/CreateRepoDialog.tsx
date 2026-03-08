import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { useGitHubStore } from "../../store/githubStore";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { githubFetch } from "../utils/api";

interface CreateRepoDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (repo: any) => void;
}

export function CreateRepoDialog({ isOpen, onClose, onCreated }: CreateRepoDialogProps) {
  const { sessionId } = useGitHubStore();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const isCreatingRef = useRef(false);

  const handleCreate = async () => {
    if (!name.trim() || isCreatingRef.current) return;
    setIsCreating(true);
    isCreatingRef.current = true;

    let successData = null;
    try {
      const res = await githubFetch('/github/create-repo', sessionId, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          private: isPrivate
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        successData = data;
      } else {
        toast.error(data.error || "Failed to create repository");
      }
    } catch (error: any) {
      // Error already handled by githubFetch
    } finally {
      setIsCreating(false);
      isCreatingRef.current = false;
    }

    // Perform follow-up actions outside the try-catch to avoid catching errors from them here
    if (successData) {
      toast.success(`Repository ${successData.repo.name} created successfully!`);
      // Reset state before closing
      setName("");
      setDescription("");
      setIsPrivate(false);
      
      // Delay these slightly to allow the UI to breathe
      setTimeout(() => {
        onCreated(successData.repo);
        onClose();
      }, 100);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Repository</DialogTitle>
          <DialogDescription>
            Create a new repository on GitHub to store your C projects.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="repo-name">Repository Name *</Label>
            <Input
              id="repo-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-c-project"
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="repo-desc">Description (optional)</Label>
            <Textarea
              id="repo-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A collection of C programs..."
            />
          </div>
          <div className="flex items-center justify-between space-x-2 border rounded-lg p-3">
            <div className="flex flex-col space-y-1">
              <Label htmlFor="repo-private">Private Repository</Label>
              <span className="text-xs text-gray-500">Only you and people you choose can see this.</span>
            </div>
            <Switch
              id="repo-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={!name.trim() || isCreating}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
