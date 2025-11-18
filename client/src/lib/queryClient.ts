import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Get API base URL - use environment variable or default to relative path
const getApiBaseUrl = () => {
  // In production (Vercel), use relative URLs which work automatically
  // In development, can use VITE_API_URL if set, otherwise relative
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Default to relative URL (works for both dev and production)
  return '';
};

const API_BASE_URL = getApiBaseUrl();

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers: Record<string, string> = data ? { "Content-Type": "application/json" } : {};
  
  // Add admin authentication token if available
  const adminToken = localStorage.getItem("admin-token");
  if (adminToken) {
    headers["Authorization"] = `Bearer ${adminToken}`;
  }

  // Ensure URL starts with / for relative paths, or use full URL if API_BASE_URL is set
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};
    
    // Add admin authentication token if available
    const adminToken = localStorage.getItem("admin-token");
    if (adminToken) {
      headers["Authorization"] = `Bearer ${adminToken}`;
    }

    // Build URL from query key
    const urlPath = queryKey.join("/") as string;
    const fullUrl = urlPath.startsWith('http') ? urlPath : `${API_BASE_URL}${urlPath.startsWith('/') ? urlPath : `/${urlPath}`}`;

    const res = await fetch(fullUrl, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
