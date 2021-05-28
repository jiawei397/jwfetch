import { join } from "path";

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

export interface RequestConfig {
  url?: string;
  method?: Method;
  baseURL?: string;
  headers?: any;
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

  stoppedErrorMessage?: string;
}

export interface AjaxExConfig extends RequestConfig {
  isFile?: boolean; // 是否要传递文件
  isNoAlert?: boolean; // 是否要提示错误信息，默认提示
  isNoCache?: boolean; // 是否缓存ajax，以避免同一时间重复请求，默认开启
  isUseOrigin?: boolean; // 为true时，直接返回response，不再处理结果
  isEncodeUrl?: boolean; //get请求时是否要进行浏览器编码
  isOutStop?: boolean;
  signal?: AbortSignal;
}

export interface AjaxConfig extends AjaxExConfig {
  url: string;
  method: Method;
  data?: FormData | any;
}

export class BaseAjax {
  static defaults: AjaxExConfig = {
    credentials: "include",
    mode: "cors",
    timeout: 1000 * 60 * 2,
    timeoutErrorMessage: "timeout",
    timeoutErrorStatus: 504,
    stoppedErrorMessage: "Ajax has been stopped! ",
    method: "POST",
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

  getUniqueKey(config: AjaxConfig) {
    return (config.baseURL || "") + config.url + config.method +
      (config.data ? JSON.stringify(config.data) : "");
  }

  /**
   * 取消接口请求
   * @param controller 取消控制器
   */
  cancel(controller: AbortController | undefined) {
    if (controller) {
      controller.abort();
    }
  }

  /**
   * 取消所有接口请求
   */
  cancelAll() {
    for (const cache of this.caches.values()) {
      this.cancel(cache.controller);
    }
  }

  /**
   * 缓存请求，同一时间同一请求只会向后台发送一次
   * @param {Object} cfg
   */
  ajax(cfg: AjaxConfig) {
    const { isOutStop, signal, isNoCache } = cfg;
    if (!isOutStop && this.isAjaxStopped()) {
      return Promise.reject(BaseAjax.defaults.stoppedErrorMessage);
    }
    const config = Object.assign({}, BaseAjax.defaults, cfg); // 把默认值覆盖了
    if (isNoCache) {
      return this.request(config);
    }
    const isCanAbort = signal === undefined &&
      typeof window.AbortController === "function"; //是否可以取消
    const uniqueKey = this.getUniqueKey(config);
    const caches = this.caches;
    if (!caches.has(uniqueKey)) {
      let controller;
      if (isCanAbort) {
        controller = new AbortController();
        config.signal = controller.signal;
      }
      const promise = this.request(config).then((result) => {
        caches.delete(uniqueKey);
        return result;
      }, (err) => {
        caches.delete(uniqueKey);
        return Promise.reject(err);
      });
      caches.set(uniqueKey, {
        promise: this.fetch_timeout(promise, controller, config),
        controller: controller,
      });
    }
    return caches.get(uniqueKey).promise;
  }

  /**
   * 提示错误，可以配置不提示
   */
  private showMessage(msg: string, config?: AjaxConfig) {
    if (config?.isNoAlert) {
      return;
    }
    if (!msg) {
      console.error("No message available");
      return;
    }
    this.handleMessage(msg);
  }

  /**
   * 处理消息，具体实现可以覆盖此项
   */
  protected handleMessage(msg: string) {
    console.error(msg);
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

  private handleBaseUrl(url: string, baseURL?: string) {
    return join(baseURL || "", url);
  }

  private handlePostData(data: any, isFile?: boolean) {
    let obj = data;
    if (typeof data === "object") {
      if (isFile) { //文件上传
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
  async request(config: AjaxConfig) {
    const {
      url,
      baseURL, //接着的前缀url
      data,
      headers = {},
      method,
      credentials,
      isFile,
      isUseOrigin,
      isEncodeUrl, //get请求时是否要进行浏览器编码
      ...otherParams
    } = config;

    let tempUrl = this.handleBaseUrl(url, baseURL);
    let body: any;
    if (method.toUpperCase() === "GET") {
      body = null; //get请求不能有body
      tempUrl = this.handleGetUrl(tempUrl, data, isEncodeUrl);
    } else {
      body = this.handlePostData(data, isFile);
      if (isFile) {
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
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
      if (!response.ok) { //代表网络请求失败，原因可能是token失效，这时需要跳转到登陆页
        this.handleErrorResponse(response);
        return Promise.reject(response);
      }
      if (isUseOrigin) {
        return response;
      }
      //以下处理成功的结果
      return response.json();
    } catch (err) { //代表网络异常
      if (err.name === "AbortError") { //属于主动取消的
      } else {
        this.showMessage(err, config);
      }
      return Promise.reject(err);
    }
  }

  /**
   * 处理错误请求
   */
  protected handleErrorResponse(response: Response) {
    console.error(
      `HTTP error, status = ${response.status}, statusText = ${response.statusText}`,
    );
  }

  /**
   * 实现fetch的timeout 功能
   * @param fecthPromise fetch
   * @param controller 取消控制器
   * @param config
   **/
  fetch_timeout(
    fecthPromise: Promise<any>,
    controller: AbortController | undefined,
    config: AjaxConfig,
  ) {
    let tp;
    const timeout = config.timeout;
    const abortPromise = new Promise((resolve, reject) => {
      tp = setTimeout(() => {
        this.cancel(controller);
        reject({
          code: config.timeoutErrorStatus,
          message: config.timeoutErrorMessage,
        });
      }, timeout);
    });

    return Promise.race([fecthPromise, abortPromise]).then((res) => {
      clearTimeout(tp);
      return res;
    });
  }

  get(url: string, data?: any, options?: AjaxExConfig) {
    return this.ajax({
      url,
      method: "get",
      data,
      ...options,
    });
  }

  post(url: string, data?: any, options?: AjaxExConfig) {
    return this.ajax({
      url,
      method: "post",
      data,
      ...options,
    });
  }
}
