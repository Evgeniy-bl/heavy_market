import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jsonServer from 'json-server';
import multer from 'multer';
import { validateRegistrationPayload } from './js/auth/register-rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(__dirname, 'data', 'db.json');
const listingImagesRoot = path.join(__dirname, 'assets', 'obyavleniya');
const port = Number(process.env.PORT) || 3001;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: 8 * 1024 * 1024
  }
});

function sanitizeFileName(originalName) {
  const sourceName = String(originalName || 'image');
  const extension = path.extname(sourceName).toLowerCase() || '.jpg';
  const baseName = path
    .basename(sourceName, extension)
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'image';

  return `${Date.now()}-${baseName}${extension}`;
}

function nextProductId(db) {
  return (db.get('products').value() || []).reduce((max, product) => {
    const id = Number(product.id);
    return Number.isFinite(id) ? Math.max(max, id) : max;
  }, 0) + 1;
}

fs.mkdirSync(listingImagesRoot, { recursive: true });

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

server.post('/api/products-with-images', upload.array('images', 8), (request, response) => {
  try {
    const rawData = request.body?.data;
    const productData = typeof rawData === 'string' ? JSON.parse(rawData) : rawData || {};
    const files = Array.isArray(request.files) ? request.files : [];

    if (!productData || typeof productData !== 'object') {
      response.status(400).json({ message: 'Некорректные данные объявления' });
      return;
    }

    const db = router.db;

    if (!db.has('products').value()) {
      db.set('products', []).write();
    }

    const incomingId = productData.id != null && productData.id !== ''
      ? Number(productData.id)
      : NaN;
    const productId = Number.isFinite(incomingId) ? incomingId : nextProductId(db);
    const productIdKey = String(productId);

    fs.mkdirSync(listingImagesRoot, { recursive: true });

    const uploadedImages = files.map((file) => {
      const safeName = sanitizeFileName(file.originalname);
      const fileName = `${productIdKey}-${safeName}`;
      const absolutePath = path.join(listingImagesRoot, fileName);
      fs.writeFileSync(absolutePath, file.buffer);
      return `assets/obyavleniya/${fileName}`;
    });

    const keptImages = Array.isArray(productData.images)
      ? productData.images.map((item) => String(item)).filter(Boolean)
      : [];

    const images = [...keptImages, ...uploadedImages].slice(0, 8);

    if (!images.length) {
      response.status(400).json({ message: 'Добавьте хотя бы одно изображение' });
      return;
    }

    const { images: _ignored, ...rest } = productData;
    const now = new Date().toISOString();
    const existing = db.get('products').find({ id: productId }).value()
      || db.get('products').find({ id: productIdKey }).value();

    const newProduct = {
      ...rest,
      id: productId,
      images,
      submittedAt: now,
      publishedAt: null
    };

    if (existing) {
      db.get('products').find({ id: existing.id }).assign(newProduct).write();
      response.status(200).json(newProduct);
      return;
    }

    db.get('products').push(newProduct).write();
    response.status(201).json(newProduct);
  } catch (error) {
    console.error('Failed to save product with images:', error);
    response.status(500).json({
      message: error.message || 'Не удалось сохранить объявление с изображениями'
    });
  }
});

function removeById(db, collection, id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) {
    return null;
  }

  const item = db.get(collection).find({ id: numericId }).value();
  if (!item) {
    return null;
  }

  db.get(collection).remove({ id: numericId }).write();
  return item;
}

server.delete('/chatMessages/:id', (request, response) => {
  const removed = removeById(router.db, 'chatMessages', request.params.id);
  if (!removed) {
    response.status(404).json({ message: 'Not found' });
    return;
  }
  response.json(removed);
});

server.delete('/messages/:id', (request, response) => {
  const removed = removeById(router.db, 'messages', request.params.id);
  if (!removed) {
    response.status(404).json({ message: 'Not found' });
    return;
  }
  response.json(removed);
});

const REGISTRATION_ERROR_MESSAGES = {
  required: 'Заполните все обязательные поля',
  ageRequirement: 'Вам меньше 16 лет',
  passwordLength: 'Пароль: от 8 до 20 символов',
  passwordUppercase: 'Нужна заглавная буква',
  passwordLowercase: 'Нужна строчная буква',
  passwordNumber: 'Нужна цифра',
  passwordSpecial: 'Нужен спецсимвол',
  passwordCommon: 'Пароль слишком простой — выберите другой'
};

server.post('/users', (request, response, next) => {
  const errorCode = validateRegistrationPayload(request.body);
  if (errorCode) {
    response.status(400).json({
      code: errorCode,
      message: REGISTRATION_ERROR_MESSAGES[errorCode] || 'Некорректные данные регистрации'
    });
    return;
  }
  next();
});

server.use(router);

server.listen(port, () => {
  console.log(`Heavy Market API: http://localhost:${port}`);
  console.log(`Listing images folder: ${listingImagesRoot}`);
});
