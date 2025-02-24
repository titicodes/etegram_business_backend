import { LendsqrErrorCode } from "./ErrorCode";

export type LendsqrErrorDetails = Record<string, unknown>;

export interface LendsqrErrorOptions<ErrorCode extends LendsqrErrorCode> {
  message: string;
  code: ErrorCode;
  details?: LendsqrErrorDetails;
  cause?: Error;
}

export class LendsqrError extends Error {
  public readonly name: string = "Lendsqr Error";
  public readonly code: LendsqrErrorCode;
  public readonly details?: LendsqrErrorDetails;
  public readonly cause?: Error | LendsqrError;
  public readonly isLendsqrError = true;

  private static makeMessage = (message: string, code: LendsqrErrorCode) =>
    `[${code}] ${message}`;

  public constructor({
    message,
    code,
    details,
    cause,
  }: LendsqrErrorOptions<LendsqrErrorCode>) {
    // @ts-ignore Typescript does not recognise 'cause' ? OR we have wrong TS version
    super(LendsqrError.makeMessage(message, code), { cause });

    // Set prototype manually, as required since Typescript 2.2: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-2.html#example
    Object.setPrototypeOf(this, LendsqrError.prototype);

    this.code = code;
    this.details = details;

    if (cause) {
      this.cause = cause;

      if ("stack" in cause) {
        this.stack = `${this.stack}\nCAUSE: ${cause.stack}`;
      }
    }

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, LendsqrError);
    }
  }
}
