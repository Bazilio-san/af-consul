class ToCurl {
  private readonly request: any;

  constructor(req: any, isPapi?: boolean) {
    if (isPapi) {
      const { hostname, port, path, method, headers } = req.req;
      let data;
      if (req.body) {
        try {
          data = JSON.parse(req.body?.toString());
        } catch (err) {
          //
        }
      }
      this.request = {
        method,
        headers,
        url: `${req._client._opts.baseUrl.protocol}//${hostname}:${port}${path}`.split('?')[0],
        params: req.opts.query,
        data,
      };
    } else {
      this.request = req;
    }
  }

  getHeaders() {
    let { headers } = this.request;
    let curlHeaders = '';

    // get the headers concerning the appropriate method (defined in the global axios instance)
    if ({}.hasOwnProperty.call(headers, 'common')) {
      headers = this.request.headers[this.request.method];
    }

    // add any custom headers (defined upon calling methods like .get(), .post(), etc.)
    Object.keys(this.request.headers).forEach((property) => {
      if (!['common', 'delete', 'get', 'head', 'patch', 'post', 'put'].includes(property)) {
        headers[property] = this.request.headers[property];
      }
    });

    Object.keys(headers).forEach((property) => {
      if ({}.hasOwnProperty.call(headers, property)) {
        if (property !== 'content-length') {
          curlHeaders += ` -H "${property}:${headers[property]}"`;
        }
      }
    });

    return curlHeaders.trim();
  }

  getMethod() {
    return `-X ${this.request.method.toUpperCase()}`;
  }

  getBody() {
    const r = this.request;
    const { data } = r;
    if (
      typeof data !== 'undefined'
      && data !== ''
      && data !== null
      && r.method.toUpperCase() !== 'GET'
    ) {
      const d = typeof data === 'object' || Object.prototype.toString.call(data) === '[object Array]'
        ? JSON.stringify(data, undefined, 2)
        : data;
      return `--data '${d}'`;// .replace(/"/g, '\\"')
    }
    return '';
  }

  getUrl() {
    if (this.request.baseURL) {
      const baseUrl = this.request.baseURL;
      const { url } = this.request;
      const finalUrl = `${baseUrl}/${url}`;
      return finalUrl
        .replace(/\/{2,}/g, '/')
        .replace('http:/', 'http://')
        .replace('https:/', 'https://');
    }
    return this.request.url;
  }

  getQueryString() {
    if (this.request.paramsSerializer) {
      const params = this.request.paramsSerializer(this.request.params);
      if (params?.length) {
        return `${params[0] === '?' ? '' : '?'}${params}`;
      }
      return '';
    }

    return Object.keys(this.request.params)
      .reduce((qs, param) => `${qs}${qs ? '&' : '?'}${param}=${this.request.params[param]}`, '');
  }

  getBuiltURL() {
    return (this.getUrl() + this.getQueryString()).trim();
  }

  getCURL() {
    return `curl -i ${this.getMethod()} "${this.getBuiltURL()}" ${this.getHeaders()} ${this.getBody()}`;
  }
}

const getCurlText = (req: any, isPapi?: boolean) => {
  const instance = new ToCurl(req, isPapi);
  return instance.getCURL();
};

export default getCurlText;
