import { getGitHubAuthToken } from "@/lib/datastore/auth";

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
    });

    if (!response.ok) return null;
    return (await response.json()) as GitHubUser;
  } catch {
    return null;
  }
}
