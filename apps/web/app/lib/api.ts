export const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3001";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("content-type", headers.get("content-type") ?? "application/json");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };

    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    if (body.message) {
      return body.message;
    }
  } catch {
    // Fall back to the status code when the API does not return JSON.
  }

  return `API request failed with status ${response.status}`;
}
