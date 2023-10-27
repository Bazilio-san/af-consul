const getHttpRequestText = (request: any) => {
  const { req: { hostname, port, path, method, headers }, body } = request;
  let res = `###\n${method} ${request.req.agent.protocol}//${hostname}${port ? `:${port}` : ''}${path}`;
  // let res = `###\n${method} ${request._client._opts.baseUrl.protocol}//${hostname}${port ? `:${port}` : ''}${path}`;
  Object.entries(headers)
    .forEach(([headerName, value]) => {
      if (headerName !== 'content-length') {
        res += `\n${headerName}: ${value}`;
      }
    });
  if ((method === 'POST' || method === 'PUT') && body) {
    try {
      res += `\n\n${JSON.stringify(JSON.parse(body.toString()), undefined, 2)}`;
    } catch (err: Error | any) {
      //
    }
  }
  return res;
};

export default getHttpRequestText;
