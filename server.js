import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsonServer from 'json-server';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(__dirname, 'data', 'db.json');
const port = Number(process.env.PORT) || 3001;

const server = jsonServer.create();
const router = jsonServer.router(databasePath);
const middlewares = jsonServer.defaults({
  logger: true,
  static: __dirname
});

server.use(middlewares);
server.use(jsonServer.bodyParser);

server.get('/', (_request, response) => {
  response.redirect('/index.html');
});

server.use(router);

server.listen(port, () => {
  console.log(`Heavy Market API: http://localhost:${port}`);
});
