import { AxiosRequestConfig } from 'axios';
import { AxiosRetry, AxiosRetryConfig } from './AxiosRetry';
import { ErrorCode } from '../Error/ErrorCode';
import { LendsqrError } from '../Error/LendsqrError';
import {
  getMessageFromApiRequestError,
  isApiRequestError,
} from './ApiRequestError';

export interface RequestOptions {
  headers?: { [name: string]: string };
}

/**
 * A controller responsible to handle all requests.
 */
export class RequestController {
  /**
   * Handles requests with retries and returns the response data.
   */
  public async request<Data, Response>(
    config: AxiosRequestConfig<Data>,
  ): Promise<Response> {
    const retryConfig: AxiosRetryConfig = {
      maxAttempts: 2,
      allowedMethods: ['GET', 'OPTIONS'],
      allowedResponseStatuses: [204, 408, 413, 429, 500, 502, 503, 504],
    };

    try {
      // Ensure AxiosRetry returns a typed response
      const response = await AxiosRetry.request<Data, Response>(retryConfig, {
        ...config,
        timeout: 15000,
      });

      // Assume the response is wrapped in a `{ data: Response }` structure
      if (!response || typeof response !== 'object' || !('data' in response)) {
        throw new Error('Invalid response structure');
      }

      return (response as { data: Response }).data; // Safely extract `data`
    } catch (error) {
      throw this.makeError(error);
    }
  }

  /**
   * Constructs a standardized error object.
   */
  private makeError(error: unknown): LendsqrError {
    if (isApiRequestError(error)) {
      const { status, statusText } = error.response;
      const apiMessage = getMessageFromApiRequestError(error);

      return new LendsqrError({
        code: ErrorCode.REQUEST_ERROR,
        message: `Request failed, ${statusText} (${status}): ${apiMessage}`,
        cause: error,
        details: {
          status,
          response: error.response,
        },
      });
    }

    const err = error instanceof Error ? error : new Error(`${error}`);
    return new LendsqrError({
      code: ErrorCode.REQUEST_ERROR,
      message: `Request failed: ${err.message}`,
      cause: err,
    });
  }

  /**
   * Makes a POST request.
   */
  public post<Response, Body>(
    url: string,
    searchParams?: Record<string, unknown>,
    body?: Body,
    options?: RequestOptions,
    abortSignal?: AbortController['signal'],
  ): Promise<Response> {
    return this.request<Body, Response>({
      url,
      params: searchParams,
      method: 'POST',
      data: body,
      headers: options?.headers,
      signal: abortSignal,
    });
  }

  /**
   * Makes a PUT request.
   */
  public put<Response, Body>(
    url: string,
    searchParams?: Record<string, unknown>,
    body?: Body,
    options?: RequestOptions,
    abortSignal?: AbortController['signal'],
  ): Promise<Response> {
    return this.request<Body, Response>({
      url,
      params: searchParams,
      method: 'PUT',
      data: body,
      headers: options?.headers,
      signal: abortSignal,
    });
  }

  /**
   * Makes a GET request.
   */
  public async get<Response>(
    url: string,
    searchParams?: Record<string, unknown>,
    options?: RequestOptions,
    abortSignal?: AbortController['signal'],
  ): Promise<Response> {
    return this.request<unknown, Response>({
      url,
      params: searchParams,
      method: 'GET',
      headers: options?.headers,
      signal: abortSignal,
    });
  }

  /**
   * Makes a DELETE request.
   */
  public async delete<Response, Body>(
    url: string,
    searchParams?: Record<string, unknown>,
    body?: Body,
    options?: RequestOptions,
    abortSignal?: AbortController['signal'],
  ): Promise<Response> {
    return this.request<Body, Response>({
      url,
      params: searchParams,
      method: 'DELETE',
      data: body,
      headers: options?.headers,
      signal: abortSignal,
    });
  }
}
