const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function userIdFromRequest(req) {
  const value = req.header('x-user-id');
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function requireUser(req, res, next) {
  const userId = userIdFromRequest(req);
  if (!userId) return res.status(401).json({ error: 'Ou dwe konekte.' });
  try {
    const { rows } = await pool.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(401).json({ error: 'Sesyon itilizatè a pa valab.' });
    req.user = rows[0];
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erè bazdone.' });
  }
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/publish', (req, res) => res.sendFile(path.join(__dirname, 'publish.html')));
app.get('/add-business', (req, res) => res.sendFile(path.join(__dirname, 'add-business.html')));
app.get('/business-details', (req, res) => res.sendFile(path.join(__dirname, 'business-details.html')));

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'connected', message: 'HELPY backend ap mache.' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: 'PostgreSQL pa konekte.' });
  }
});

// ================= AUTH =================
app.post('/api/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!name || !email || !password) return res.status(400).json({ error: 'Ranpli tout chan yo.' });
    if (password.length < 6) return res.status(400).json({ error: 'Mo de pas la dwe gen omwen 6 karaktè.' });

    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (exists.rows[0]) return res.status(400).json({ error: 'Imèl sa a gen yon kont deja.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id,name,email,created_at',
      [name, email, passwordHash]
    );
    const user = rows[0];
    res.status(201).json({ message: 'Kont kreye ak siksè!', user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Nou pa ka kreye kont lan.' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const { rows } = await pool.query('SELECT id,name,email,password_hash FROM users WHERE email = $1', [email]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(400).json({ error: 'Imèl oswa mo de pas pa bon.' });
    }
    res.json({ message: 'Koneksyon reyisi!', user: { id: rows[0].id, name: rows[0].name, email: rows[0].email } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erè sèvè.' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id,name,email,created_at FROM users WHERE id=$1', [Number(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ error: 'Itilizatè pa jwenn.' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: 'Erè bazdone.' }); }
});

// ================= BUSINESSES =================
app.get('/api/businesses', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const params = [];
    let sql = 'SELECT * FROM businesses';
    if (q) {
      params.push(`%${q}%`);
      sql += ' WHERE name ILIKE $1 OR category ILIKE $1 OR description ILIKE $1 OR location ILIKE $1';
    }
    sql += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(sql, params);
    res.json({ statut: 'ok', entreprises: rows, businesses: rows });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Erè chajman antrepriz yo.' }); }
});

app.post('/api/businesses', async (req, res) => {
  try {
    const userId = userIdFromRequest(req);
    const { name, category, description='', phone='', whatsapp='', address='', location='', image_url='' } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'Non antrepriz la ak kategori a obligatwa.' });
    const { rows } = await pool.query(
      `INSERT INTO businesses (user_id,name,category,description,phone,whatsapp,address,location,image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [userId, String(name).trim(), String(category).trim(), description, phone, whatsapp, address, location, image_url]
    );
    res.status(201).json({ statut: 'ok', status: 'ok', message: 'Antrepriz ajoute ak siksè!', entreprise: rows[0], business: rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Nou pa ka ajoute antrepriz la.' }); }
});

app.get('/api/businesses/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM businesses WHERE id=$1', [Number(req.params.id)]);
    if (!rows[0]) return res.status(404).json({ error: 'Antrepriz pa jwenn.' });
    res.json({ statut: 'ok', status: 'ok', entreprise: rows[0], business: rows[0] });
  } catch (error) { res.status(500).json({ error: 'Erè bazdone.' }); }
});

// ================= SERVICES =================
app.post('/api/services', async (req, res) => {
  try {
    const userId = userIdFromRequest(req);
    const { title, category, phone, description='' } = req.body;
    if (!title || !category || !phone) return res.status(400).json({ error: 'Mete enfòmasyon ki nesesè yo.' });
    const { rows } = await pool.query(
      'INSERT INTO services (user_id,title,category,phone,description) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [userId, title, category, phone, description]
    );
    res.status(201).json({ status: 'ok', message: 'Sèvis pibliye!', service: rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Nou pa ka pibliye sèvis la.' }); }
});

app.get('/api/services', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM services ORDER BY created_at DESC');
    res.json({ status: 'ok', services: rows });
  } catch (error) { res.status(500).json({ error: 'Erè chajman sèvis yo.' }); }
});

// ================= LISTINGS =================
app.get('/api/listings', async (req, res) => {
  try {
    const params = [];
    const where = ['status = \'active\''];
    if (req.query.user_id) { params.push(Number(req.query.user_id)); where.push(`user_id=$${params.length}`); }
    if (req.query.category) { params.push(String(req.query.category)); where.push(`category ILIKE $${params.length}`); }
    if (req.query.type) { params.push(String(req.query.type)); where.push(`type=$${params.length}`); }
    const { rows } = await pool.query(`SELECT * FROM listings WHERE ${where.join(' AND ')} ORDER BY created_at DESC`, params);
    res.json({ status: 'ok', listings: rows });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Erè chajman annonces yo.' }); }
});

app.post('/api/listings', requireUser, async (req, res) => {
  try {
    const { title, description='', price=null, currency='HTG', category='', location='', phone='', whatsapp='', image_url='', type='product' } = req.body;
    if (!title) return res.status(400).json({ error: 'Tit la obligatwa.' });
    const { rows } = await pool.query(
      `INSERT INTO listings (user_id,title,description,price,currency,category,location,phone,whatsapp,image_url,type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.id,title,description,price === '' ? null : price,currency,category,location,phone,whatsapp,image_url,type]
    );
    res.status(201).json({ status: 'ok', listing: rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Nou pa ka kreye annonce a.' }); }
});

app.get('/api/listings/:id', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, u.name AS owner_name FROM listings l LEFT JOIN users u ON u.id=l.user_id WHERE l.id=$1`,
      [Number(req.params.id)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Piblikasyon sa pa egziste.' });
    res.json(rows[0]);
  } catch (error) { res.status(500).json({ error: 'Erè bazdone.' }); }
});

app.delete('/api/listings/:id', requireUser, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM listings WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Annonce pa jwenn oswa li pa pou ou.' });
    res.json({ status: 'ok', message: 'Annonce efase.' });
  } catch (error) { res.status(500).json({ error: 'Erè efasman.' }); }
});

// ================= REVIEWS =================
app.get('/api/reviews/:businessId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.id,r.rating,r.comment,r.created_at,u.name AS reviewer_name
       FROM reviews r LEFT JOIN users u ON u.id=r.user_id
       WHERE r.business_id=$1 ORDER BY r.created_at DESC`, [Number(req.params.businessId)]
    );
    res.json({ status: 'ok', reviews: rows });
  } catch (error) { res.status(500).json({ error: 'Erè chajman avis yo.' }); }
});

app.post('/api/reviews', requireUser, async (req, res) => {
  try {
    const businessId = Number(req.body.business_id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || '').trim();
    if (!businessId || rating < 1 || rating > 5 || !comment) return res.status(400).json({ error: 'Avis la pa konplè.' });
    const { rows } = await pool.query(
      `INSERT INTO reviews (business_id,user_id,rating,comment) VALUES ($1,$2,$3,$4)
       ON CONFLICT (business_id,user_id) DO UPDATE SET rating=EXCLUDED.rating,comment=EXCLUDED.comment,created_at=NOW()
       RETURNING *`, [businessId, req.user.id, rating, comment]
    );
    await pool.query(
      `UPDATE businesses b SET rating=x.avg_rating, review_count=x.count_reviews
       FROM (SELECT business_id, ROUND(AVG(rating)::numeric,2) avg_rating, COUNT(*) count_reviews FROM reviews WHERE business_id=$1 GROUP BY business_id) x
       WHERE b.id=x.business_id`, [businessId]
    );
    res.status(201).json({ status: 'ok', review: rows[0] });
  } catch (error) { console.error(error); res.status(500).json({ error: 'Nou pa ka sove avis la.' }); }
});

// ================= MESSAGES =================
app.get('/api/messages', requireUser, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT m.*, s.name AS sender_name, r.name AS receiver_name
       FROM messages m LEFT JOIN users s ON s.id=m.sender_id LEFT JOIN users r ON r.id=m.receiver_id
       WHERE m.sender_id=$1 OR m.receiver_id=$1 ORDER BY m.created_at DESC`, [req.user.id]
    );
    res.json({ status: 'ok', messages: rows });
  } catch (error) { res.status(500).json({ error: 'Erè chajman mesaj yo.' }); }
});

app.post('/api/messages', requireUser, async (req, res) => {
  try {
    const receiverId = Number(req.body.receiver_id);
    const message = String(req.body.message || '').trim();
    if (!receiverId || !message) return res.status(400).json({ error: 'Destinatè ak mesaj obligatwa.' });
    const { rows } = await pool.query(
      'INSERT INTO messages (sender_id,receiver_id,message) VALUES ($1,$2,$3) RETURNING *',
      [req.user.id, receiverId, message]
    );
    res.status(201).json({ status: 'ok', message: rows[0] });
  } catch (error) { res.status(500).json({ error: 'Nou pa ka voye mesaj la.' }); }
});

// ================= SEARCH =================
app.get('/api/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    const type = String(req.query.type || 'all');
    const like = `%${q}%`;
    const out = [];

    if (type === 'all' || type === 'business') {
      const { rows } = await pool.query(
        `SELECT id,name AS title,description,category,location,image_url,'business' AS type FROM businesses
         WHERE $1='' OR name ILIKE $2 OR category ILIKE $2 OR description ILIKE $2 OR location ILIKE $2 ORDER BY created_at DESC LIMIT 50`, [q, like]
      );
      out.push(...rows);
    }
    if (type === 'all' || type === 'service') {
      const { rows } = await pool.query(
        `SELECT id,title,description,category,NULL AS location,NULL AS image_url,'service' AS type FROM services
         WHERE $1='' OR title ILIKE $2 OR category ILIKE $2 OR description ILIKE $2 ORDER BY created_at DESC LIMIT 50`, [q, like]
      );
      out.push(...rows);
    }
    if (type === 'all' || type === 'product' || type === 'real_estate' || type === 'vehicle') {
      const wanted = type === 'product' ? 'product' : type === 'all' ? null : type;
      const params = [q, like];
      let extra = '';
      if (wanted) { params.push(wanted); extra = ` AND type=$3`; }
      const { rows } = await pool.query(
        `SELECT id,title,description,category,location,image_url,type FROM listings
         WHERE status='active' ${extra} AND ($1='' OR title ILIKE $2 OR category ILIKE $2 OR description ILIKE $2 OR location ILIKE $2)
         ORDER BY created_at DESC LIMIT 50`, params
      );
      out.push(...rows);
    }
    res.json(out);
  } catch (error) { console.error(error); res.status(500).json({ error: 'Erè rechèch la.' }); }
});

// ================= FAVORITES =================
app.get('/api/favorites', requireUser, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM favorites WHERE user_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json({ status: 'ok', favorites: rows });
  } catch (error) { res.status(500).json({ error: 'Erè chajman favoris yo.' }); }
});

app.post('/api/favorites', requireUser, async (req, res) => {
  try {
    const itemType = String(req.body.item_type || '').trim();
    const itemId = Number(req.body.item_id);
    if (!itemType || !itemId) return res.status(400).json({ error: 'Favori a pa konplè.' });
    const { rows } = await pool.query(
      `INSERT INTO favorites (user_id,item_type,item_id) VALUES ($1,$2,$3)
       ON CONFLICT (user_id,item_type,item_id) DO NOTHING RETURNING *`, [req.user.id,itemType,itemId]
    );
    res.status(201).json({ status: 'ok', favorite: rows[0] || null });
  } catch (error) { res.status(500).json({ error: 'Erè favoris.' }); }
});

app.delete('/api/favorites/:type/:id', requireUser, async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE user_id=$1 AND item_type=$2 AND item_id=$3', [req.user.id, req.params.type, Number(req.params.id)]);
    res.json({ status: 'ok' });
  } catch (error) { res.status(500).json({ error: 'Erè favoris.' }); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API route pa jwenn.' }));

async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, '0.0.0.0', () => console.log(`HELPY backend ap mache sou pò ${PORT}`));
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

start();
