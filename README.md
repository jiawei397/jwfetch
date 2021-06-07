# 封装的fetch

## 包含功能点

- 同一时间段重复请求会被缓存过滤掉
- timeout
- 取消请求

## 使用

### 封装ajax
``` ts
import { BaseAjax } from "./index";

export class Ajax extends BaseAjax {
  /**
   * 处理消息，具体实现可以覆盖此项
   */
  protected handleMessage(msg: string) {
    super.handleMessage(msg);
  }

  /**
   * 处理错误请求
   */
  protected handleErrorResponse(response: Response) {
    console.error(
      `HTTP error, status = ${response.status}, statusText = ${response.statusText}`,
    );
    if (response.status === 401) { //权限问题
      this.stopAjax();
      this.abortAll();
      // toLogin();
    }
  }
}

Ajax.defaults.baseURL = "/api";

export const ajax = new Ajax();
export const get = ajax.get.bind(ajax);
export const post = ajax.post.bind(ajax);
```

### 拦截
``` ts
// 请求拦截
ajax.interceptors.request.use(function(config) {
  config.headers = config.headers || {};
  config.headers.token = "abcd";
  return config;
}, function(err)  {
  return Promise.reject(err);
});

// 响应拦截
ajax.interceptors.response.use(function(data) {
  return data.slice(0, 10);
}, function(err)  {
  return Promise.reject(err);
});
```

### 获取可取消的请求

```ts 
const {promise, abort}  = ajax.getAbortResult(url, data, options);
promise.then((result) => console.log(result));
abort(); // 取消请求

const {promise2, abort2}  = ajax.postAbortResult(url, data, options);
promise2.then((result) => console.log(result));
abort2(); // 取消请求
```
