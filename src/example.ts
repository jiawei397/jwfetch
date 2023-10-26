import { Ajax } from "./index";

Ajax.defaults.baseURL = "/api";

export const ajax = new Ajax();
// export const get = ajax.get.bind(ajax);
// export const post = ajax.post.bind(ajax);
// export const request = ajax.ajax.bind(ajax);

ajax.interceptors.request.use(
  function (config) {
    config.headers = config.headers || {};
    config.headers.token = "abcd";
    return config;
  },
  function (err) {
    return Promise.reject(err);
  }
);

ajax.interceptors.response.use(
  function (data) {
    return data.slice(0, 10);
  },
  function (err) {
    console.log("err", err);
    return Promise.reject(err);
  }
);

const url = "/api/user/info";
const data = {
  id: "aaa",
};
ajax
  .ajax<User>({
    url,
    method: "post",
    data,
  })
  .then((res) => console.log(res));
type User = {
  name: string;
};
// ajax.get<User>(url, data).then((res) => console.log(res));
// ajax.post<User>(url, data).then((res) => console.log(res));
