const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const dataDirectory = process.env.SHORTLY_DATA_DIR || root;
fs.mkdirSync(dataDirectory, { recursive: true });
const dataFile = path.join(dataDirectory, 'links.json');
let links = [];
try { links = JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { /* First run: start with an empty link list. */ }

function saveLinks() {
  fs.writeFileSync(dataFile, JSON.stringify(links, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 32) || 'link';
}

const server = http.createServer((req, res) => {
  const forwardedProtocol = req.headers['x-forwarded-proto']?.split(',')[0].trim();
  const protocol = forwardedProtocol || 'http';
  const requestUrl = new URL(req.url, `${protocol}://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && requestUrl.pathname === '/api/links') {
    return sendJson(res, 200, links.map((link) => ({ ...link, shortUrl: `${requestUrl.origin}/${link.slug}` })));
  }
  if (req.method === 'POST' && requestUrl.pathname === '/api/shorten') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; if (body.length > 10_000) req.destroy(); });
    req.on('end', () => {
      try {
        const { url } = JSON.parse(body || '{}');
        const destination = new URL(url);
        if (!['http:', 'https:'].includes(destination.protocol)) throw new Error('Enter a valid http or https URL.');
        const base = slugify(destination.pathname.split('/').filter(Boolean).pop() || destination.hostname.split('.')[0]);
        let slug = base;
        while (links.some((link) => link.slug === slug)) slug = `${base.slice(0, 25)}-${crypto.randomBytes(3).toString('hex')}`;
        const link = { slug, url: destination.href, clicks: 0, created: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), status: 'Active' };
        links.unshift(link);
        saveLinks();
        return sendJson(res, 201, { ...link, shortUrl: `${requestUrl.origin}/${slug}` });
      } catch (error) {
        return sendJson(res, 400, { error: error.message || 'Could not create this short link.' });
      }
    });
    return;
  }
  if (req.method === 'GET' && requestUrl.pathname !== '/' && !path.extname(requestUrl.pathname)) {
    const slug = decodeURIComponent(requestUrl.pathname.slice(1));
    const link = links.find((item) => item.slug === slug);
    if (link) {
      link.clicks += 1;
      saveLinks();
      res.writeHead(302, { Location: link.url, 'Cache-Control': 'no-store' });
      return res.end();
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end('<h1>Link not found</h1><p>This short link does not exist on this server.</p><a href="/">Go to Shortly</a>');
  }

  const requested = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
  if (!['index.html', 'styles.css', 'app.js'].includes(requested)) {
    res.writeHead(404); return res.end('Not found');
  }
  const file = path.resolve(root, requested);
  if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end('Not found');
  }
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Shortly is running at http://localhost:${port}`);
});
