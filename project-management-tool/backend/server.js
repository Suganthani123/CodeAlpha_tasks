const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'project_management.db'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS project_members (
        project_id INTEGER,
        user_id INTEGER,
        role TEXT DEFAULT 'member'
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        project_id INTEGER,
        assigned_to INTEGER,
        created_by INTEGER,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        due_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        task_id INTEGER,
        author_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Database tables ready');
});

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ message: 'No token' });
    try {
        const decoded = jwt.verify(token, 'my_secret_key');
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ----- TEST ROUTE (must work) -----
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is alive on port 5000!' });
});

// ----- AUTH -----
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (user) return res.status(400).json({ message: 'User exists' });
        const hashed = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashed],
            function(err) {
                if (err) return res.status(500).json({ message: 'DB error' });
                const token = jwt.sign({ userId: this.lastID }, 'my_secret_key');
                res.json({ token, user: { id: this.lastID, name, email, role: 'member' } });
            });
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: 'Invalid credentials' });
        const token = jwt.sign({ userId: user.id }, 'my_secret_key');
        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
});

// ----- PROJECTS -----
app.get('/api/projects', auth, (req, res) => {
    db.all(`SELECT p.* FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            WHERE pm.user_id = ?`, [req.user.userId], (err, projects) => {
        res.json(projects || []);
    });
});

app.post('/api/projects', auth, (req, res) => {
    const { name, description } = req.body;
    db.run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)',
        [name, description, req.user.userId],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error' });
            const projectId = this.lastID;
            db.run('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)',
                [projectId, req.user.userId, 'admin']);
            res.json({ id: projectId, name, description });
        });
});

// ----- TASKS -----
app.get('/api/tasks/project/:projectId', auth, (req, res) => {
    db.all('SELECT * FROM tasks WHERE project_id = ?', [req.params.projectId], (err, tasks) => {
        res.json(tasks || []);
    });
});

app.post('/api/tasks', auth, (req, res) => {
    const { title, description, project_id, priority, due_date } = req.body;
    db.run(`INSERT INTO tasks (title, description, project_id, created_by, priority, due_date)
            VALUES (?, ?, ?, ?, ?, ?)`,
        [title, description, project_id, req.user.userId, priority || 'medium', due_date],
        function(err) {
            if (err) return res.status(500).json({ message: 'Error' });
            res.json({ id: this.lastID, title, description, project_id, priority });
        });
});

app.put('/api/tasks/:id', auth, (req, res) => {
    const { status } = req.body;
    db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
        res.json({ message: 'Updated' });
    });
});

app.delete('/api/tasks/:id', auth, (req, res) => {
    db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], () => {
        res.json({ message: 'Deleted' });
    });
});

// ----- COMMENTS -----
app.post('/api/comments', auth, (req, res) => {
    const { content, task_id } = req.body;
    db.run('INSERT INTO comments (content, task_id, author_id) VALUES (?, ?, ?)',
        [content, task_id, req.user.userId],
        function(err) {
            res.json({ id: this.lastID, content, task_id });
        });
});

app.get('/api/comments/task/:taskId', auth, (req, res) => {
    db.all('SELECT * FROM comments WHERE task_id = ?', [req.params.taskId], (err, comments) => {
        res.json(comments || []);
    });
});

// ----- START SERVER -----
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Test endpoint: http://localhost:${PORT}/api/test`);
});