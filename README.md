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

## ajax配置项
### baseURL

Type: `string`

请求url的前缀

### headers

Type: `any`

添加的请求头

### data

Type: `any`

请求数据，一般是个对象{}。

### timeout

Type: `number`
Default: `2 * 60 * 1000`，2分钟

过期时间，单位ms。从请求开始，到这个时间如果接口没有响应，则会返回一个失败的promise。

### timeoutErrorMessage

Type: `string`
Default: `timeout`

过期时间错误提示

### timeoutErrorStatus

Type: `number`
Default: `504`

过期时间状态码

### credentials

Type: `string`
Default: `include`

- omit：忽略cookie的发送
- same-origin: 表示cookie只能同域发送，不能跨域发送
- include: cookie既可以同域发送，也可以跨域发送

### mode

Type: `string`
Default: `cors`

- same-origin：该模式是不允许跨域的，它需要遵守同源策略，否则浏览器会返回一个error告知不能跨域；其对应的response type为basic。
- cors: 该模式支持跨域请求，顾名思义它是以CORS的形式跨域；当然该模式也可以同域请求不需要后端额外的CORS支持；其对应的response type为cors。
- no-cors: 该模式用于跨域请求但是服务器不带CORS响应头，也就是服务端不支持CORS；这也是fetch的特殊跨域请求方式；其对应的response type为opaque。

### stoppedErrorMessage
Type: `string`
Default: `Ajax has been stopped! `

当所有ajax停止后，提示错误信息。
### isFile

Type: `boolean`

是否属于文件上传，如果是这样，会根据传递的data，创建一个FormData

### isNoAlert

Type: `boolean`

是否要禁止默认提示错误信息。如果需要自己处理错误消息，则开启此项。

### isUseOrigin

Type: `boolean`

为true时，直接返回response，不再处理结果

### isEncodeUrl

Type: `boolean`

get请求时是否要进行浏览器编码

### isOutStop

Type: `boolean`

当所有ajax请求停止时，是否要跳出请求。

### signal

Type: `AbortSignal`

主动控制取消请求时可传递此参数，或者直接使用ajaxAbortResult方法。例如：
```
const controller = new AbortController();
const {signal} = controller;
```

### cacheTimeout

Type: `number`

缓存时间
- 如果是-1，代表不清除缓存。
- 如果是0，代表不使用缓存。
