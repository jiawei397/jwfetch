import { FetchError, FetchErrorType } from "./error";
import {
  ErrorRequestCallback,
  ErrorResponseCallback,
  AjaxExConfig,
  RequestCallback,
  ResponseCallback,
  AjaxConfig,
  AjaxResult,
  AbortResult,
  AjaxData,
} from "./types";
import { deleteUndefinedProperty, resolveUrl } from "./utils";

class Interceptors<T, E> {
  public chain: any[];

  constructor() {
    this.chain = [];
  }

  use(callback: T, errorCallback: E) {
    this.chain.push(callback, errorCallback);
    return this.chain.length - 2;
  }

  eject(index: number) {
    this.chain.splice(index, 2);
  }
}

export class Ajax {
  static defaults: AjaxExConfig = {
    credentials: "include",
    mode: "cors",
    timeout: 1000 * 60 * 2,
    timeoutErrorMessage: "timeout",
    timeoutErrorStatus: 504,
    stoppedErrorMessage: "Ajax has been stopped! ",
    method: "post",
    defaultPutAndPostContentType: "application/json; charset=UTF-8",
    debug: false,
  };

  private defaultConfig: AjaxExConfig;

  constructor(cfg: AjaxExConfig = {}) {
    this.defaultConfig = { ...Ajax.defaults, ...cfg };
  }

  public interceptors = {
    request: new Interceptors<RequestCallback, ErrorRequestCallback>(),
    response: new Interceptors<ResponseCallback, ErrorResponseCallback>(),
  };

  public caches = new Map(); // 缓存所有已经请求的Promise，同一时间重复的不再请求
  private IS_AJAX_STOP = false;

  /**
   * 停止ajax
   */
  stopAjax() {
    this.IS_AJAX_STOP = true;
  }

  isAjaxStopped() {
    return this.IS_AJAX_STOP;
  }

  protected getUniqueKey(config: AjaxConfig) {
    return (
      (config.baseURL || "") +
      config.url +
      config.method +
      (config.data ? JSON.stringify(config.data) : "")
    );
  }

  /**
   * 取消接口请求
   * @param controller 取消控制器
   */
  abort(controller?: AbortController) {
    controller?.abort();
  }

  /**
   * 取消所有接口请求
   */
  abortAll() {
    for (const cache of this.caches.values()) {
      if (!cache.config.isOutStop) {
        // 如果是要跳出停止处理的，就不能给取消了
        this.abort(cache.controller);
      }
    }
  }

  private handleGetUrl(url: string, data: any, isEncodeUrl?: boolean) {
    let tempUrl = url;
    if (typeof data === "object") {
      const exArr = [];
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          exArr.push(key + "=" + data[key]);
        }
      }
      if (exArr.length > 0) {
        const exUrl = isEncodeUrl
          ? encodeURI(encodeURI(exArr.join("&")))
          : exArr.join("&"); //这里怎么加密，与后台解密方式也有关。如果不是这样的格式，就自己拼接url
        if (!tempUrl.includes("?")) {
          tempUrl += "?" + exUrl;
        } else {
          tempUrl += "&" + exUrl;
        }
      }
    } else {
      if (data) {
        if (!tempUrl.includes("?")) {
          tempUrl += "?" + data;
        } else {
          tempUrl += "&" + data;
        }
      }
    }
    return tempUrl;
  }

  private handlePostData(data: any, isFile?: boolean) {
    let obj = data;
    if (typeof data === "object") {
      if (data instanceof FormData) {
        // 不用处理
      } else if (isFile) {
        //文件上传
        const formData = new FormData(); //构造空对象，下面用append方法赋值。
        for (const key in data) {
          if (!data.hasOwnProperty(key)) {
            continue;
          }
          const value = data[key];
          if (key == "files" && Array.isArray(value)) {
            value.forEach((file) => formData.append(key, file));
          } else {
            formData.append(key, value); //例：formData.append("file", document.getElementById('fileName').files[0]);
          }
        }
        obj = formData;
      } else {
        obj = JSON.stringify(data);
      }
    }
    return obj;
  }

  /**
   * 进行fetch请求
   * @param config 配置
   */
  private async request(config: AjaxConfig) {
    const {
      url,
      baseURL, //前缀url
      data,
      query,
      headers = {},
      method,
      credentials,
      isFile,
      isUseOrigin,
      isEncodeUrl, //get请求时是否要进行浏览器编码
      ignore,
      defaultPutAndPostContentType,
      ...otherParams
    } = config;

    let tempUrl = resolveUrl(url, baseURL);
    let body: any;
    if (method.toUpperCase() === "GET") {
      body = null; //get请求不能有body
      tempUrl = this.handleGetUrl(tempUrl, data, isEncodeUrl);
    } else {
      if (query) {
        tempUrl = this.handleGetUrl(tempUrl, query, isEncodeUrl);
      }
      body = this.handlePostData(data, isFile);
      if (body && !(body instanceof FormData)) {
        // 如果是FormData，不需要设置content-type
        if (method.toUpperCase() === "POST" || method.toUpperCase() === "PUT") {
          if (
            !Object.keys(headers).find(
              (key) => key.toLowerCase() === "content-type"
            )
          ) {
            headers["content-type"] = defaultPutAndPostContentType!;
          }
        }
      }
    }
    try {
      const response = await fetch(tempUrl, {
        headers,
        body,
        method,
        credentials,
        ...otherParams,
      });
      const getResult = () => {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        }
        return response.text();
      };
      if (!response.ok) {
        // 状态码不是200到300，代表请求失败
        if (!(Array.isArray(ignore) && ignore.includes(response.status))) {
          // 如果不忽略错误码
          if (isUseOrigin) {
            return Promise.reject(response);
          }
          const error = await getResult();
          return Promise.reject(
            new FetchError(error, FetchErrorType.HTTP, config, response.status)
          );
        }
      }
      if (isUseOrigin) {
        return response;
      }
      //以下处理成功的结果
      return getResult();
    } catch (err) {
      //代表网络异常
      return Promise.reject(
        new FetchError(err, FetchErrorType.Network, config)
      );
    }
  }

  isAbortError(err: Error) {
    return err.name === "AbortError";
  }

  private mergeAbortConfig(
    config: AjaxConfig,
    signal?: AbortSignal
  ): AbortController | undefined {
    let controller;
    if (typeof AbortController === "function" && signal === undefined) {
      // 如果要自己控制取消请求，需要自己传递signal，或者使用isReturnAbort参数
      controller = new AbortController();
      config.signal = controller.signal;
    }
    return controller;
  }

  private mergeConfig(cfg: AjaxConfig): AjaxConfig {
    deleteUndefinedProperty(cfg);
    const config = Object.assign({}, this.defaultConfig, cfg); // 把默认值覆盖了
    const chain = this.interceptors.request.chain;
    for (let i = 0; i < chain.length; i += 2) {
      try {
        chain[i](config);
      } catch (e) {
        // console.error("mergeConfig error", e); // 正常请求的处理不应该报错
        chain[i + 1]?.(e);
      }
    }
    return config;
  }

  private mergeResponse(promise: Promise<any>) {
    const chain = this.interceptors.response.chain;
    for (let i = 0; i < chain.length; i += 2) {
      promise = promise.then(chain[i], chain[i + 1]);
    }
    return promise;
  }

  private clearCacheByKey(uniqueKey: string, cacheTimeout?: number) {
    if (cacheTimeout !== undefined) {
      if (cacheTimeout >= 0) {
        // 如果小于0，不清除
        setTimeout(() => {
          this.caches.delete(uniqueKey);
        }, cacheTimeout);
      }
    } else {
      this.caches.delete(uniqueKey);
    }
  }

  /**
   * 实现fetch的timeout 功能
   * @param fecthPromise fetch
   * @param controller 取消控制器
   * @param config
   **/
  private fetch_timeout(
    fecthPromise: Promise<any>,
    controller: AbortController | undefined,
    config: AjaxConfig
  ) {
    let tp: any;
    const timeout = config.timeout;
    const abortPromise = new Promise((resolve, reject) => {
      tp = setTimeout(() => {
        this.abort(controller);
        reject(
          new FetchError(
            config.timeoutErrorMessage,
            FetchErrorType.Timeout,
            config,
            config.timeoutErrorStatus
          )
        );
      }, timeout);
    });

    return Promise.race([fecthPromise, abortPromise]).then(
      (res) => {
        clearTimeout(tp);
        return res;
      },
      (err) => {
        clearTimeout(tp);
        return Promise.reject(err);
      }
    );
  }

  private core_ajax(mergedConfig: AjaxConfig): AjaxResult {
    const { signal } = mergedConfig;
    const controller = this.mergeAbortConfig(mergedConfig, signal);
    const temp = this.request(mergedConfig);
    const promise = this.fetch_timeout(temp, controller, mergedConfig);
    return {
      promise: this.mergeResponse(promise),
      config: mergedConfig,
      controller,
    };
  }

  /**
   * 缓存请求，同一时间同一请求只会向后台发送一次
   */
  private cache_ajax(cfg: AjaxConfig): AjaxResult {
    const mergedConfig = this.mergeConfig(cfg);
    const { cacheTimeout } = mergedConfig;
    if (cacheTimeout === 0) {
      // 不缓存结果，也就是说不会过滤掉重复的请求
      return this.core_ajax(mergedConfig);
    }
    const uniqueKey = this.getUniqueKey(mergedConfig);
    const caches = this.caches;
    if (!caches.has(uniqueKey)) {
      const result = this.core_ajax(mergedConfig);
      result.promise = result.promise.then(
        (res) => {
          this.clearCacheByKey(uniqueKey, mergedConfig.cacheTimeout);
          return res;
        },
        (err) => {
          this.clearCacheByKey(uniqueKey, mergedConfig.cacheTimeout);
          return Promise.reject(err);
        }
      );
      caches.set(uniqueKey, result);
    } else {
      if (mergedConfig.debug) {
        console.debug(`read from cache : ${uniqueKey}`);
      }
    }
    return caches.get(uniqueKey);
  }

  private all_ajax(cfg: AjaxConfig): AjaxResult {
    const { isOutStop } = cfg;
    if (!isOutStop && this.isAjaxStopped()) {
      return {
        promise: Promise.reject(
          new FetchError(cfg.stoppedErrorMessage, FetchErrorType.Stop, cfg)
        ),
        config: cfg,
      };
    }
    return this.cache_ajax(cfg);
  }

  /**
   * ajax主方法，返回promise
   */
  ajax<T>(cfg: AjaxConfig): Promise<T> {
    const result = this.all_ajax(cfg);
    return result.promise as Promise<T>;
  }

  /**
   * 调用ajax的同时，返回取消ajax请求的方法
   */
  ajaxAbortResult<T>(cfg: AjaxConfig): AbortResult<T> {
    const result = this.all_ajax(cfg);
    return {
      promise: result.promise as Promise<T>,
      abort: () => {
        return this.abort(result.controller);
      },
    };
  }

  get<T>(url: string, data?: AjaxData, options?: AjaxExConfig) {
    return this.ajax<T>({
      url,
      method: "get",
      data,
      ...options,
    });
  }

  /**
   * 调用ajax的get请求的同时，返回取消ajax请求的方法
   */
  getAbortResult<T>(url: string, data?: AjaxData, options?: AjaxExConfig) {
    return this.ajaxAbortResult<T>({
      url,
      method: "get",
      data,
      ...options,
    });
  }

  post<T>(url: string, data?: AjaxData, options?: AjaxExConfig) {
    return this.ajax<T>({
      url,
      method: "post",
      data,
      ...options,
    });
  }

  /**
   * 调用ajax的post请求同时，返回取消ajax请求的方法
   */
  postAbortResult<T>(url: string, data?: AjaxData, options?: AjaxExConfig) {
    return this.ajaxAbortResult<T>({
      url,
      method: "post",
      data,
      ...options,
    });
  }
}

export {
  FetchError,
  FetchErrorType,
  AjaxExConfig,
  AjaxConfig,
  AjaxData,
  AjaxResult,
  ErrorRequestCallback,
  ErrorResponseCallback,
};
