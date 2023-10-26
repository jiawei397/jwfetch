export enum FetchErrorType {
  Network = "network",
  // Abort = "abort",
  Timeout = "timeout",
  HTTP = "http",
  Stop = "stop",
}

export class FetchError extends Error {
  name = "FetchError";
  type: FetchErrorType;
  status?: number; // status code
  originError?: any;
  cause: any;

  constructor(
    message: string | Error | Record<string, any>,
    type: FetchErrorType,
    status?: number
  ) {
    super(typeof message === "string" ? message : message.message);
    if (typeof message !== "string") {
      if (message instanceof Error) {
        this.stack = message.stack;
        // this.cause = message.cause;
      }
      this.originError = message;
    }
    this.type = type;
    this.status = status;
  }
}
