const getHttpRequestText = (request: any) => {
  const { req: { hostname, port, path, method, headers }, body } = request;
  let msg = `###\n${method} ${request._client._opts.baseUrl.protocol}//${hostname}${port ? `:${port}` : ''}${path}`;
  Object.entries(headers)
    .forEach(([headerName, value]) => {
      if (headerName !== 'content-length') {
        msg += `\n${headerName}: ${value}`;
      }
    });
  if ((method === 'POST' || method === 'PUT') && body) {
    try {
      msg += `\n\n${JSON.stringify(JSON.parse(body.toString()), undefined, 2)}`;
    } catch (err: Error | any) {
      //
    }
  }
  return msg;
};

export default getHttpRequestText;
