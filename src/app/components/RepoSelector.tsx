import { useState, useEffect } from "react";
import { FolderGit2, Loader2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { useGitHubStore } from "../../store/githubStore";
import { toast } from "sonner";
import { CreateRepoDialog } from "./CreateRepoDialog";
import { API_URL } from "../utils/api";

export function RepoSelector({ onRepoSelect }: { onRepoSelect: (repo: any) => void }) {
  const { isConnected, sessionId } = useGitHubStore();
  const [isOpen, setIsOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (isOpen && isConnected && repos.length === 0) {
      fetchRepos();
    }
  }, [isOpen, isConnected]);

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/github/repos`, {
        headers: { "x-session-id": sessionId || "" }
      });
      const data = await res.json();
      if (data.success) {
        setRepos(data.repos);
      } else {
        toast.error(data.error || "Failed to fetch repositories.");
      }
    } catch (error) {
      toast.error("Network error fetching repositories.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (repo: any) => {
    setIsOpen(false);
    onRepoSelect(repo);
  };

  if (!isConnected) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/20 hover:bg-white/10 text-gray-700 dark:text-gray-200"
          >
            <FolderGit2 className="w-4 h-4 mr-2 text-indigo-500" />
            Fetch from GitHub
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col pt-4">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <DialogTitle>Select Repository</DialogTitle>
            <Button 
                size="sm" 
                onClick={() => {
                    setIsCreateDialogOpen(true);
                    setIsOpen(false);
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white gap-1 h-8"
              >
                <Plus className="w-3 h-3" />
                New Repo
              </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto mt-4 space-y-2 pr-2 custom-horizontal-scroll">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
              </div>
            ) : repos.length === 0 ? (
              <p className="text-center text-sm text-gray-500 py-8">No repositories found.</p>
            ) : (
              repos.map((repo) => (
                <Button
                  key={repo.id}
                  variant="ghost"
                  className="w-full justify-start text-left font-normal bg-gray-50 hover:bg-purple-50 dark:bg-gray-900/50 dark:hover:bg-purple-900/20"
                  onClick={() => handleSelect(repo)}
                >
                  <div className="truncate w-full">
                    <span className="font-medium">{repo.name}</span>
                    <span className="text-xs text-gray-500 ml-2">({repo.full_name})</span>
                  </div>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateRepoDialog 
        isOpen={isCreateDialogOpen} 
        onClose={() => setIsCreateDialogOpen(false)}
        onCreated={(newRepo) => {
          setRepos([newRepo, ...repos]);
          onRepoSelect(newRepo);
        }}
      />
    </>
  );
}
