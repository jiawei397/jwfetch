import { AjaxConfig } from "./types";

export enum FetchErrorType {
  Network = "network",
  // Abort = "abort",
  Timeout = "timeout",
  HTTP = "http",
  Stop = "stop",
}

export class FetchError extends Error {
  name = "FetchError";
  originError?: any;
  // cause: any;

  constructor(
    message: string | Error | Record<string, any>,
    public type: FetchErrorType,
    public config: AjaxConfig,
    public status?: number
  ) {
    super(typeof message === "string" ? message : message.message);
    if (typeof message !== "string") {
      if (message instanceof Error) {
        this.stack = message.stack;
        // this.cause = message.cause;
      }
      this.originError = message;
    }
  }
}
