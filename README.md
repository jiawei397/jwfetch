# 封装的fetch

## 包含功能点

- 同一时间段重复请求会被缓存过滤掉
- timeout
- 取消

## 使用

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
      this.cancelAll();
      // toLogin();
    }
  }
}

Ajax.defaults.baseURL = "/api";

export const ajax = new Ajax();
export const get = ajax.get.bind(ajax);
export const post = ajax.post.bind(ajax);

```
