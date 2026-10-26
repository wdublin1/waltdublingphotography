import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import path from 'node:path';
import {handleRequest} from '../api/index.mjs';

const port = Number(process.env.PORT || 4175);
const publicRoot = path.resolve('public');
const types = {'.css':'text/css','.js':'text/javascript','.json':'application/json','.html':'text/html','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ico':'image/x-icon'};
createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,`http://localhost:${port}`);
    let filePath = path.resolve(publicRoot,'.'+decodeURIComponent(url.pathname));
    if (!filePath.startsWith(publicRoot + path.sep) && filePath !== publicRoot) {res.writeHead(403);res.end();return;}
    if (url.pathname === '/studio' || (url.pathname.startsWith('/studio/') && !path.extname(url.pathname))) filePath=path.join(publicRoot,'studio/index.html');
    const info = await stat(filePath).catch(()=>null);
    if (req.method === 'GET' && info?.isFile()) {
      const data = await readFile(filePath);
      let mime=types[path.extname(filePath)] || 'application/octet-stream';
      if (data.subarray(0,4).toString() === 'RIFF' && data.subarray(8,12).toString() === 'WEBP') mime='image/webp';
      res.writeHead(200,{'Content-Type':mime});res.end(data);return;
    }
    const request = new Request(url,{method:req.method,headers:req.headers,...(!['GET','HEAD'].includes(req.method)?{body:req,duplex:'half'}:{})});
    const response = await handleRequest(request);
    res.writeHead(response.status,Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error) {console.error('dev_request_error',error.name,error.message);res.writeHead(500);res.end('Request failed.');}
}).listen(port,'0.0.0.0',()=>console.log(`Photography website available at http://localhost:${port}`));
