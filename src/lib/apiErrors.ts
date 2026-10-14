/**
 * Thrown by the write helpers in the API modules when the backend returns a
 * 401. Callers catch this to run the refresh-token flow and, if that fails,
 * send the user back to the login screen. Shared so an `instanceof` check
 * works regardless of which API module surfaced it.
 */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown by write helpers that surface the backend's own explanation of a
 * failed request (e.g. "One or more skill ids do not exist."). `message` is
 * that explanation, or empty when the response didn't carry a usable one —
 * callers fall back to their own copy in that case.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ProblemDetails {
  title?: string;
  errors?: Record<string, string[]>;
}

/**
 * Reads a human-readable reason off a failed response. The backend replies to
 * a bad request in one of two shapes: a plain-text body from the controller,
 * or ASP.NET's JSON `ValidationProblemDetails` from model binding. Returns the
 * plain text, or the first field error (falling back to the title) for JSON,
 * or `""` when there's nothing usable.
 */
export async function readErrorMessage(res: Response): Promise<string> {
  let body: string;
  try {
    body = (await res.text()).trim();
  } catch {
    return "";
  }
  if (!body) return "";
  if (!body.startsWith("{")) return body;
  try {
    const problem = JSON.parse(body) as ProblemDetails;
    const firstFieldError = Object.values(problem.errors ?? {}).flat()[0];
    return firstFieldError ?? problem.title ?? "";
  } catch {
    return "";
  }
}
