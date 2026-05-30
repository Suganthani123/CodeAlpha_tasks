const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 5001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// In-memory storage
let users = [];
let posts = [];
let stories = [];
let messages = [];

let nextUserId = 1;
let nextPostId = 1;
let nextStoryId = 1;
let nextMsgId = 1;

const findUserByUsername = (username) => users.find(u => u.username === username);
const findPostById = (id) => posts.find(p => p.id === id);
const findStoryById = (id) => stories.find(s => s.id === id);

app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend is working!' });
});

// User routes
app.get('/api/users', (req, res) => {
    res.json(users.map(u => ({
        username: u.username,
        fullName: u.fullName,
        avatar: u.avatar,
        bio: u.bio
    })));
});

app.get('/api/user/:username', (req, res) => {
    const user = findUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const userPosts = posts.filter(p => p.username === user.username);
    res.json({
        username: user.username,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        followersCount: user.followers.length,
        followingCount: user.following.length,
        postsCount: userPosts.length
    });
});

app.post('/api/register', (req, res) => {
    const { username, email, password, fullName } = req.body;
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    const newUser = {
        id: nextUserId++,
        username,
        email,
        password,
        fullName: fullName || username,
        avatar: '😀',
        bio: 'Welcome to my profile! 🚀',
        followers: [],
        following: []
    };
    users.push(newUser);
    res.json({
        success: true,
        user: {
            username: newUser.username,
            email: newUser.email,
            fullName: newUser.fullName,
            avatar: newUser.avatar,
            bio: newUser.bio
        }
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({
        success: true,
        user: {
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            avatar: user.avatar,
            bio: user.bio
        }
    });
});

app.post('/api/follow', (req, res) => {
    const { currentUser, targetUser } = req.body;
    const current = findUserByUsername(currentUser);
    const target = findUserByUsername(targetUser);
    if (!current || !target) return res.status(404).json({ error: 'User not found' });
    const alreadyFollowing = current.following.includes(targetUser);
    if (!alreadyFollowing) {
        current.following.push(targetUser);
        target.followers.push(currentUser);
    } else {
        current.following = current.following.filter(u => u !== targetUser);
        target.followers = target.followers.filter(u => u !== currentUser);
    }
    res.json({ success: true, following: !alreadyFollowing });
});

// Post routes
app.get('/api/posts', (req, res) => {
    res.json(posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.get('/api/posts/user/:username', (req, res) => {
    const userPosts = posts.filter(p => p.username === req.params.username)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(userPosts);
});

app.get('/api/feed/:username', (req, res) => {
    const user = findUserByUsername(req.params.username);
    if (!user) return res.json([]);
    const following = user.following;
    const feedPosts = posts.filter(p => following.includes(p.username) || p.username === req.params.username)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(feedPosts);
});

app.post('/api/posts', (req, res) => {
    const { username, content, image } = req.body;
    const user = findUserByUsername(username);
    const newPost = {
        id: nextPostId++,
        username,
        userAvatar: user ? user.avatar : '😀',
        content,
        image: image || '',
        likes: [],
        likesList: [],
        comments: [],
        createdAt: new Date()
    };
    posts.push(newPost);
    console.log('Post created:', newPost.id);
    res.json(newPost);
});

app.post('/api/posts/:id/like', (req, res) => {
    const { username } = req.body;
    const post = findPostById(parseInt(req.params.id));
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const liked = post.likes.includes(username);
    if (!liked) {
        post.likes.push(username);
        post.likesList.push({ username, avatar: '😀', likedAt: new Date() });
    } else {
        post.likes = post.likes.filter(u => u !== username);
        post.likesList = post.likesList.filter(l => l.username !== username);
    }
    res.json({ likesCount: post.likes.length, liked: !liked, likesList: post.likesList });
});

app.post('/api/posts/:id/comment', (req, res) => {
    const { username, text } = req.body;
    const post = findPostById(parseInt(req.params.id));
    if (!post) return res.status(404).json({ error: 'Post not found' });
    post.comments.push({ username, text, createdAt: new Date() });
    res.json(post.comments);
});

app.delete('/api/posts/:id', (req, res) => {
    posts = posts.filter(p => p.id !== parseInt(req.params.id));
    res.json({ success: true });
});

// Story routes
app.get('/api/stories', (req, res) => {
    const now = new Date();
    const validStories = stories.filter(s => (now - new Date(s.createdAt)) < 24 * 60 * 60 * 1000);
    const grouped = {};
    validStories.forEach(story => {
        if (!grouped[story.username]) {
            grouped[story.username] = {
                username: story.username,
                userAvatar: story.userAvatar,
                stories: []
            };
        }
        grouped[story.username].stories.push(story);
    });
    res.json(Object.values(grouped));
});

app.post('/api/stories', (req, res) => {
    const { username, userAvatar, image } = req.body;
    const newStory = {
        id: nextStoryId++,
        username,
        userAvatar: userAvatar || '😀',
        image,
        views: [],
        likes: [],
        createdAt: new Date()
    };
    stories.push(newStory);
    res.json(newStory);
});

app.post('/api/stories/:id/view', (req, res) => {
    const { username } = req.body;
    const story = findStoryById(parseInt(req.params.id));
    if (story && !story.views.includes(username) && story.username !== username) {
        story.views.push(username);
    }
    res.json({ viewsCount: story ? story.views.length : 0 });
});

app.post('/api/stories/:id/like', (req, res) => {
    const { username } = req.body;
    const story = findStoryById(parseInt(req.params.id));
    if (story) {
        const liked = story.likes.includes(username);
        if (!liked) story.likes.push(username);
        else story.likes = story.likes.filter(u => u !== username);
        res.json({ likesCount: story.likes.length, liked: !liked });
    } else {
        res.status(404).json({ error: 'Story not found' });
    }
});

app.get('/api/stories/:id/details', (req, res) => {
    const story = findStoryById(parseInt(req.params.id));
    if (story) {
        res.json({ views: story.views, likes: story.likes });
    } else {
        res.status(404).json({ error: 'Story not found' });
    }
});

// DM routes
app.get('/api/conversations/:username', (req, res) => {
    const userMessages = messages.filter(m => m.from === req.params.username || m.to === req.params.username);
    const convSet = new Set();
    userMessages.forEach(m => {
        if (m.from === req.params.username) convSet.add(m.to);
        else convSet.add(m.from);
    });
    const conversations = Array.from(convSet).map(other => {
        const user = users.find(u => u.username === other);
        const lastMsg = userMessages.filter(m => (m.from === other && m.to === req.params.username) || (m.from === req.params.username && m.to === other))
            .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        return {
            user: user ? { username: user.username, fullName: user.fullName, avatar: user.avatar } : null,
            lastMessage: lastMsg ? lastMsg.text : '',
            unread: userMessages.filter(m => m.to === req.params.username && m.from === other && !m.read).length
        };
    });
    res.json(conversations);
});

app.get('/api/messages/:user1/:user2', (req, res) => {
    const chat = messages.filter(m =>
        (m.from === req.params.user1 && m.to === req.params.user2) ||
        (m.from === req.params.user2 && m.to === req.params.user1)
    ).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt));
    res.json(chat);
});

app.post('/api/messages', (req, res) => {
    const { from, to, text } = req.body;
    const newMsg = {
        id: nextMsgId++,
        from,
        to,
        text,
        read: false,
        createdAt: new Date()
    };
    messages.push(newMsg);
    res.json(newMsg);
});

app.put('/api/messages/read/:from/:to', (req, res) => {
    messages.forEach(m => {
        if (m.from === req.params.from && m.to === req.params.to && !m.read) {
            m.read = true;
        }
    });
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ Test: http://localhost:${PORT}/api/test`);
});