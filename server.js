const express = require('express');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads')); // Make uploaded files accessible

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true
}));

// File upload settings
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

// In-memory database
const users = [];
const documents = [];

// Home page
app.get('/', (req, res) => {
  const cssLink = `<link rel="stylesheet" href="style.css">`;

  if (req.session.user) {
    res.send(`
      ${cssLink}
      <h2>Welcome, ${req.session.user.username}</h2>
      <div class="nav">
        <a href="/upload">📤 Upload Document</a>
        <a href="/documents">📚 My Documents</a>
        <a href="/logout">🚪 Logout</a>
      </div>
    `);
  } else {
    res.send(`
      ${cssLink}
      <h2>📦 Welcome to My Book Storage Site</h2>
      <div class="nav">
        <a href="/signup">📝 Signup</a>
        <a href="/login">🔐 Login</a>
      </div>
    `);
  }
});

// Signup
app.get('/signup', (req, res) => res.sendFile(__dirname + '/public/signup.html'));
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (users.find(u => u.username === username)) {
    return res.send('Username exists! <a href="/signup">Try again</a>');
  }
  const hashed = await bcrypt.hash(password, 10);
  users.push({ username, password: hashed });
  res.send('Signup successful! <a href="/login">Login</a>');
});

// Login
app.get('/login', (req, res) => res.sendFile(__dirname + '/public/login.html'));
app.post('/login', async (req, res) => {
  const user = users.find(u => u.username === req.body.username);
  if (!user) return res.send('User not found');
  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.send('Wrong password');
  req.session.user = { username: user.username };
  res.redirect('/');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Upload page
app.get('/upload', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.sendFile(__dirname + '/public/upload.html');
});
app.post('/upload', upload.single('document'), (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  documents.push({
    username: req.session.user.username,
    title: req.body.title,
    author: req.body.author,
    file: req.file.filename
  });
  res.send('Upload successful! <a href="/">Back Home</a>');
});

// View user’s documents
app.get('/documents', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const cssLink = `<link rel="stylesheet" href="style.css">`;
  const userDocs = documents.filter(d => d.username === req.session.user.username);

  let html = `${cssLink}<h2>📁 Your Documents</h2><div class="doc-list">`;
  userDocs.forEach(doc => {
    html += `
      <div class="doc-card">
        <h3>${doc.title}</h3>
        <p><i>by ${doc.author}</i></p>
        <a href="/uploads/${doc.file}" download>⬇ Download</a>
      </div>`;
  });
  html += '</div><br><a href="/">⬅ Back</a>';
  res.send(html);
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
