const http = require('http');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname);
const port = 3000;

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8',
  '.fbx': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  let requestUrl = req.url;
  if (requestUrl.includes('?')) {
    requestUrl = requestUrl.split('?')[0];
  }

  // Décode les espaces et caractères spéciaux dans l'URL
  try {
    requestUrl = decodeURIComponent(requestUrl);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('URL invalide');
    return;
  }

  if (requestUrl === '/') {
    requestUrl = '/index.html';
  }

  const safePath = path.normalize(path.join(rootDir, requestUrl));
  if (!safePath.startsWith(rootDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Accès refusé');
    return;
  }

  fs.stat(safePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('Fichier non trouvé');
      return;
    }

    if (stats.isDirectory()) {
      const indexFile = path.join(safePath, 'index.html');
      fs.stat(indexFile, (indexErr) => {
        if (indexErr) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=UTF-8' });
          res.end('Accès interdit');
          return;
        }
        serveFile(indexFile, res);
      });
    } else {
      serveFile(safePath, res);
    }
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  console.log(`[SERVE] ${filePath} (${contentType})`);
  res.writeHead(200, { 'Content-Type': contentType });
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error(`[ERROR] Erreur de lecture: ${filePath}`, err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('Erreur de lecture du fichier');
  });
}


server.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}/`);
});
