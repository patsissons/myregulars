import { getGitHubAuthToken } from "@/lib/datastore/auth";
import { REQUEST_TIMEOUT_MS } from "@/lib/datastore/constants";

interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
}

export async function getAuthenticatedUser(): Promise<GitHubUser | null> {
  const token = getGitHubAuthToken();
  if (!token) return null;

  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return null;
    return (await response.json()) as GitHubUser;
  } catch {
    return null;
  }
}
