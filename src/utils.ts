export function jsonParse(str: any) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return str;
  }
}

export function deleteUndefinedProperty(obj: any) {
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (obj[key] === undefined) {
        delete obj[key];
      }
    }
  }
}
