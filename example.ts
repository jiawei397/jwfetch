import {BaseAjax} from "./index";

export class Ajax extends BaseAjax {
  /**
   * 处理消息
   */
  protected handleMessage(msg: string) {
    super.handleMessage(msg);

    // your message code
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
export const request = ajax.ajax.bind(ajax);

ajax.interceptors.request.use(function (config) {
  config.headers = config.headers || {};
  config.headers.token = "abcd";
  return config;
}, function (err) {
  return Promise.reject(err);
});

ajax.interceptors.response.use(function (data) {
  return data.slice(0, 10);
}, function (err) {
  return Promise.reject(err);
});

const url = '/api/user/info';
const data = {
  id: "aaa"
};
request({
  url,
  method: 'post',
  data
});
get(url, data);
post(url, data);
