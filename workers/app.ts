import http from 'node:http';
import { httpServerHandler } from 'cloudflare:node';
import app from '../server';

const server = http.createServer(app as any);
const handler = httpServerHandler(server) as any;

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api')) {
      const res = await env.ASSETS.fetch(request);
      if (res.status !== 404) return res;
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url).toString(), request));
    }
    return handler.fetch(request, env, ctx);
  },
};
