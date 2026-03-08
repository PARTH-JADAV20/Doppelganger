/// <reference types="vite/client" />
import { toast } from "sonner";
import { useGitHubStore } from "../../store/githubStore";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

// Helper to make authenticated GitHub API calls
export async function githubFetch(
  endpoint: string,
  sessionId: string | null,
  options: RequestInit = {}
) {
  const url = `${API_URL}${endpoint}`;
  const headers = {
    ...options.headers,
    "x-session-id": sessionId || "",
  };

  try {
    const response = await fetch(url, { ...options, headers });
    
    // Handle 401 - session expired or invalid
    if (response.status === 401) {
      toast.error("Session expired. Please reconnect to GitHub.");
      useGitHubStore.getState().clearSession();
      throw new Error("Session expired");
    }

    return response;
  } catch (error) {
    if ((error as Error).message !== "Session expired") {
      toast.error("Network error. Please check your connection.");
    }
    throw error;
  }
}

// Validate session on app startup
export async function validateSession(sessionId: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/auth/validate`, {
      headers: { "x-session-id": sessionId },
    });
    
    if (response.status === 401) {
      return false;
    }
    
    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error("Session validation error:", error);
    return false;
  }
}
