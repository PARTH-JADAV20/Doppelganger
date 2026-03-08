import { create } from 'zustand';

export interface GitHubFile {
  path: string;
  sha: string;
  originalContent: string;
  isModified: boolean;
}

interface GitHubState {
  sessionId: string | null;
  username: string | null;
  isConnected: boolean;
  selectedRepo: string | null; // owner/repo
  trackedFiles: Record<string, GitHubFile>;
  
  // Actions
  setSession: (sessionId: string, username: string) => void;
  clearSession: () => void;
  setSelectedRepo: (repoFullName: string | null) => void;
  trackFile: (path: string, sha: string, content: string) => void;
  markFileModified: (path: string, isModified: boolean) => void;
  untrackFile: (path: string) => void;
}

export const useGitHubStore = create<GitHubState>((set) => ({
  sessionId: localStorage.getItem('github_session_id') || null,
  username: localStorage.getItem('github_username') || null,
  isConnected: !!localStorage.getItem('github_session_id'),
  selectedRepo: null,
  trackedFiles: {},

  setSession: (sessionId, username) => {
    localStorage.setItem('github_session_id', sessionId);
    localStorage.setItem('github_username', username);
    set({ sessionId, username, isConnected: true });
  },

  clearSession: () => {
    localStorage.removeItem('github_session_id');
    localStorage.removeItem('github_username');
    set({ sessionId: null, username: null, isConnected: false, selectedRepo: null, trackedFiles: {} });
  },

  setSelectedRepo: (repoFullName) => set({ selectedRepo: repoFullName }),

  trackFile: (path, sha, content) => set((state) => ({
    trackedFiles: {
      ...state.trackedFiles,
      [path]: { path, sha, originalContent: content, isModified: false }
    }
  })),

  markFileModified: (path, isModified) => set((state) => {
    const file = state.trackedFiles[path];
    if (!file) return state;
    return {
      trackedFiles: {
        ...state.trackedFiles,
        [path]: { ...file, isModified }
      }
    };
  }),

  untrackFile: (path) => set((state) => {
    const { [path]: removed, ...rest } = state.trackedFiles;
    return { trackedFiles: rest };
  }),
}));
