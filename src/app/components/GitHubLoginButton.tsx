import { Github, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useGitHubStore } from "../../store/githubStore";

export function GitHubLoginButton() {
  const { isConnected, username, clearSession } = useGitHubStore();

  const handleLogin = () => {
    // Redirects to backend which redirects to GitHub OAuth
    window.location.href = "http://localhost:3001/auth/github";
  };

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/10 dark:bg-white/10 rounded-lg">
          <Github className="w-4 h-4 text-gray-700 dark:text-gray-300" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {username}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={clearSession}
          className="h-8 w-8 text-gray-500 hover:text-red-500 hover:bg-red-500/10"
          title="Disconnect GitHub"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogin}
      className="bg-gray-900 text-white hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200 border-none flex items-center gap-2 shadow-md"
    >
      <Github className="w-4 h-4" />
      <span>Connect GitHub</span>
    </Button>
  );
}
