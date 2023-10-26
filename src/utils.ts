export function deleteUndefinedProperty(obj: any) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }
  }
}

export function resolveUrl(url: string, baseURL?: string) {
  if (!baseURL) return url;
  if (url.startsWith("http")) {
    return url;
  }
  if (!baseURL.endsWith("/")) {
    baseURL += "/";
  }
  if (url.startsWith("/")) {
    url = url.substring(1);
  }
  return baseURL + url;
}
