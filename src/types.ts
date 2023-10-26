import { FetchError } from "./error";

export type Method =
  | "get"
  | "GET"
  | "delete"
  | "DELETE"
  | "head"
  | "HEAD"
  | "options"
  | "OPTIONS"
  | "post"
  | "POST"
  | "put"
  | "PUT"
  | "patch"
  | "PATCH"
  | "purge"
  | "PURGE"
  | "link"
  | "LINK"
  | "unlink"
  | "UNLINK";

export type Credentials = "omit" | "include" | "same-origin";

export type Mode = "same-origin" | "cors" | "no-cors";

export type AbortResult<T> = {
  promise: Promise<T>;
  abort: () => void;
};

export interface AjaxResult {
  promise: Promise<unknown>;
  config: AjaxConfig;
  controller?: AbortController;
}

export interface RequestConfig {
  url?: string;

  keepalive?: boolean;

  method?: Method;
  baseURL?: string;
  headers?: Record<string, any>;
  data?: any;
  timeout?: number;
  timeoutErrorMessage?: string;
  timeoutErrorStatus?: number;
  /**
   * omit：忽略cookie的发送
   *
   * same-origin: 表示cookie只能同域发送，不能跨域发送
   *
   * include: cookie既可以同域发送，也可以跨域发送
   */
  credentials?: Credentials;
  /**
   *  same-origin：该模式是不允许跨域的，它需要遵守同源策略，否则浏览器会返回一个error告知不能跨域；其对应的response type为basic。
   *
   *  cors: 该模式支持跨域请求，顾名思义它是以CORS的形式跨域；当然该模式也可以同域请求不需要后端额外的CORS支持；其对应的response type为cors。
   *
   *  no-cors: 该模式用于跨域请求但是服务器不带CORS响应头，也就是服务端不支持CORS；这也是fetch的特殊跨域请求方式；其对应的response type为opaque。
   */
  mode?: Mode;

  cache?:
    | "default"
    | "no-store"
    | "reload"
    | "no-cache"
    | "force-cache"
    | "only-if-cached";

  stoppedErrorMessage?: string;

  ignore?: number[];
}

export interface AjaxExConfig extends RequestConfig {
  query?: string | Record<string, string | number | boolean>;

  isFile?: boolean; // 是否要传递文件
  isNoAlert?: boolean; // 是否要提示错误信息，默认提示
  isUseOrigin?: boolean; // 为true时，直接返回response，不再处理结果
  isEncodeUrl?: boolean; //get请求时是否要进行浏览器编码
  isOutStop?: boolean;
  /**
   * 主动控制取消请求时可传递此参数，或者直接使用ajaxAbortResult方法。例如：
   *
   *    const controller = new AbortController();
   *    const {signal} = controller;
   */
  signal?: AbortSignal;
  /**
   * 如果是-1，代表不清除缓存
   *
   * 如果是0，代表不使用缓存
   */
  cacheTimeout?: number;

  /* 是否debug，打印一些消息 */
  debug?: boolean;

  /* 默认put和post的content-type */
  defaultPutAndPostContentType?: string;
}

export type AjaxData = any;

export interface AjaxConfig extends AjaxExConfig {
  url: string;
  method: Method;
  data?: AjaxData;
}

export type RequestCallback = (config: AjaxConfig) => AjaxConfig;

export type ErrorRequestCallback = (error: Error) => void;

export type ErrorResponseCallback = (error: FetchError) => Promise<any>;

export type ResponseCallback = (data: any) => Promise<any>;
