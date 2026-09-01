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
