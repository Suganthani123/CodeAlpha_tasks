const API_URL = 'http://localhost:5001/api';
let currentUser = null;
let currentChatUser = null;

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('searchInput')?.addEventListener('input', (e) => searchUsers(e.target.value));
    document.getElementById('loginForm')?.addEventListener('submit', login);
    document.getElementById('registerForm')?.addEventListener('submit', register);
}

async function checkLoginStatus() {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
        currentUser = JSON.parse(saved);
        showLoggedInUI();
    } else {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('appContainer').style.display = 'none';
    }
}

function showLoggedInUI() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('appContainer').style.display = 'grid';
    loadCreatePostBox();
    loadStories();
    loadSidebar();
    loadTrending();
    loadSuggestions();
    loadFeed();
}

function showLoginTab() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
}

function showRegisterTab() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('registerTab').classList.add('active');
}

function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
}

async function login(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showLoggedInUI();
            showToast(`Welcome ${username}! 🎉`, 'success');
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Cannot connect to server. Make sure backend is running on port 5001', 'error');
    }
}

async function register(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const fullName = document.getElementById('regFullName').value;
    const password = document.getElementById('regPassword').value;
    try {
        const res = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, fullName, password })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Registration successful! Please login.', 'success');
            showLoginTab();
            document.getElementById('regUsername').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regFullName').value = '';
            document.getElementById('regPassword').value = '';
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Registration failed', 'error');
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    location.reload();
}

// ---------- Stories ----------
async function loadStories() {
    if (!currentUser) return;
    try {
        const res = await fetch(`${API_URL}/stories`);
        const stories = await res.json();
        const container = document.getElementById('storiesContainer');
        let html = `<div class="story-item" onclick="openCreateStory()"><div class="story-circle"><span>+</span></div><div class="story-name">Your story</div></div>`;
        stories.forEach(s => {
            if (s.stories && s.stories.length) {
                const story = s.stories[s.stories.length-1];
                html += `<div class="story-item" onclick="viewStory(${story.id}, '${story.image}')"><div class="story-circle"><span>${s.userAvatar || '📷'}</span></div><div class="story-name">${s.username}</div></div>`;
            }
        });
        container.innerHTML = html;
    } catch(e) { console.error(e); }
}

function openCreateStory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (ev) => {
                await fetch(`${API_URL}/stories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: currentUser.username, userAvatar: currentUser.avatar, image: ev.target.result })
                });
                showToast('Story added!', 'success');
                loadStories();
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function viewStory(storyId, imageUrl) {
    const viewer = document.getElementById('storyViewer');
    document.getElementById('storyImage').src = imageUrl;
    viewer.style.display = 'flex';
    setTimeout(() => viewer.style.display = 'none', 5000);
    fetch(`${API_URL}/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
    }).catch(()=>{});
}
function closeStoryViewer() { document.getElementById('storyViewer').style.display = 'none'; }

// ---------- Posts ----------
async function loadFeed() {
    try {
        const res = await fetch(`${API_URL}/feed/${currentUser.username}`);
        let posts = await res.json();
        if (posts.length === 0) {
            const all = await fetch(`${API_URL}/posts`);
            posts = await all.json();
        }
        displayPosts(posts);
    } catch(e) {
        document.getElementById('postsContainer').innerHTML = '<div style="text-align:center;padding:2rem;">Failed to load posts</div>';
    }
}

function displayPosts(posts) {
    const container = document.getElementById('postsContainer');
    if (!posts.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;">No posts yet. Be the first to post! 🚀</div>';
        return;
    }
    container.innerHTML = posts.map(post => `
        <div class="post-card">
            <div class="post-header">
                <div class="avatar">${post.userAvatar || '😀'}</div>
                <div class="post-user">
                    <div class="post-name"><strong>${post.username}</strong></div>
                    <div class="post-time">${timeAgo(post.createdAt)}</div>
                </div>
            </div>
            ${post.image ? `<img src="${post.image}" class="post-image">` : ''}
            <div class="post-content">${escapeHtml(post.content)}</div>
            <div class="post-stats">
                <span onclick="showLikes(${post.id})"><i class="fas fa-heart"></i> ${post.likes.length} likes</span>
                <span><i class="fas fa-comment"></i> ${post.comments.length} comments</span>
            </div>
            <div class="post-buttons">
                <button class="post-btn ${post.likes.includes(currentUser.username) ? 'liked' : ''}" onclick="toggleLike(${post.id})"><i class="fas fa-heart"></i> Like</button>
                <button class="post-btn" onclick="toggleComments(${post.id})"><i class="fas fa-comment"></i> Comment</button>
                ${currentUser.username === post.username ? `<button class="post-btn" onclick="deletePost(${post.id})"><i class="fas fa-trash"></i> Delete</button>` : ''}
            </div>
            <div class="comments-section" id="comments-${post.id}" style="display:none;">
                ${post.comments.map(c => `<div class="comment"><strong>${c.username}:</strong> ${escapeHtml(c.text)}</div>`).join('')}
                <div class="comment-input">
                    <input type="text" id="comment-${post.id}" placeholder="Add a comment...">
                    <button onclick="addComment(${post.id})">Post</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function showLikes(postId) {
    const res = await fetch(`${API_URL}/posts`);
    const allPosts = await res.json();
    const post = allPosts.find(p => p.id === postId);
    if (!post.likesList.length) { alert('No likes yet'); return; }
    alert('❤️ Liked by:\n' + post.likesList.map(l => `   @${l.username}`).join('\n'));
}

async function toggleLike(postId) {
    const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username })
    });
    if (res.ok) loadFeed();
}

async function addComment(postId) {
    const input = document.getElementById(`comment-${postId}`);
    const text = input?.value.trim();
    if (!text) return;
    await fetch(`${API_URL}/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, text })
    });
    input.value = '';
    loadFeed();
}

async function deletePost(postId) {
    if (confirm('Delete this post?')) {
        await fetch(`${API_URL}/posts/${postId}`, { method: 'DELETE' });
        loadFeed();
    }
}
function toggleComments(postId) {
    const div = document.getElementById(`comments-${postId}`);
    div.style.display = div.style.display === 'none' ? 'block' : 'none';
}

function loadCreatePostBox() {
    document.getElementById('createPostBox').innerHTML = `
        <div class="create-post-header">
            <div class="avatar">${currentUser.avatar}</div>
            <div class="post-input" onclick="openPostModal()">What's on your mind, ${currentUser.username}?</div>
        </div>
        <div class="create-post-actions">
            <div class="action-icon" onclick="openPostModal()"><i class="fas fa-image"></i> Photo</div>
            <div class="action-icon" onclick="openPostModal()"><i class="fas fa-smile"></i> Feeling</div>
        </div>
    `;
}
function openPostModal() { document.getElementById('postModal').style.display = 'flex'; }
function closePostModal() {
    document.getElementById('postModal').style.display = 'none';
    document.getElementById('postContent').value = '';
    document.getElementById('postImage').value = '';
    document.getElementById('imagePreview').innerHTML = '';
}
async function createPost() {
    const content = document.getElementById('postContent').value;
    if (!content.trim()) { showToast('Please write something!', 'error'); return; }
    let image = '';
    const file = document.getElementById('postImage').files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => await submitPost(content, e.target.result);
        reader.readAsDataURL(file);
    } else {
        await submitPost(content, '');
    }
}
async function submitPost(content, image) {
    const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: currentUser.username, content, image })
    });
    if (res.ok) {
        closePostModal();
        loadFeed();
        showToast('Post created!', 'success');
    } else {
        showToast('Failed to create post', 'error');
    }
}

// ---------- Sidebar & Suggestions ----------
function loadSidebar() {
    document.getElementById('sidebarContainer').innerHTML = `
        <div class="profile-card" onclick="openProfile()">
            <div class="avatar" style="width:55px;height:55px;font-size:2rem;">${currentUser.avatar}</div>
            <div class="profile-info">
                <div class="profile-name">${currentUser.fullName}</div>
                <div style="font-size:0.8rem;">@${currentUser.username}</div>
            </div>
            <button class="btn-secondary" onclick="event.stopPropagation();logout()">Logout</button>
        </div>
    `;
}
async function loadSuggestions() {
    const res = await fetch(`${API_URL}/users`);
    let users = await res.json();
    users = users.filter(u => u.username !== currentUser.username).slice(0,5);
    let card = document.getElementById('suggestionsCard');
    if (!card) {
        document.getElementById('sidebarContainer').innerHTML += `<div class="suggestions-card" id="suggestionsCard"><h4>Suggested for you</h4><div id="suggestionsList"></div></div>`;
        card = document.getElementById('suggestionsCard');
    }
    document.getElementById('suggestionsList').innerHTML = users.map(u => `
        <div class="suggestion-item" onclick="viewProfile('${u.username}')">
            <div class="avatar" style="width:40px;height:40px;">${u.avatar}</div>
            <div style="flex:1;"><strong>${u.fullName}</strong><div style="font-size:0.7rem;">@${u.username}</div></div>
            <button class="follow-btn" onclick="event.stopPropagation();followUser('${u.username}')">Follow</button>
        </div>
    `).join('');
}
async function loadTrending() {
    if (!document.getElementById('trendingCard')) {
        document.getElementById('sidebarContainer').innerHTML += `<div class="trending-card" id="trendingCard"><h4>Trending Topics</h4><div id="trendingList"></div></div>`;
    }
    const trends = [
        { topic: '#Technology', posts: '12.5k' },
        { topic: '#CodingLife', posts: '8.2k' },
        { topic: '#SocialMedia', posts: '6.7k' }
    ];
    document.getElementById('trendingList').innerHTML = trends.map(t => `<div class="suggestion-item"><div><strong>${t.topic}</strong><div style="font-size:0.7rem;">${t.posts} posts</div></div></div>`).join('');
}
async function followUser(targetUser) {
    await fetch(`${API_URL}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUser: currentUser.username, targetUser })
    });
    showToast(`Followed ${targetUser}`, 'success');
    loadSuggestions();
}

// ---------- Profile and DM functions ----------
async function viewProfile(username) {
    const userRes = await fetch(`${API_URL}/user/${username}`);
    const user = await userRes.json();
    const postsRes = await fetch(`${API_URL}/posts/user/${username}`);
    const posts = await postsRes.json();
    const feedDiv = document.querySelector('.feed');
    feedDiv.innerHTML = `
        <div style="background:#1a1a2e;border-radius:16px;padding:1.5rem;text-align:center;margin-bottom:1rem;">
            <div class="avatar" style="width:80px;height:80px;font-size:3rem;margin:0 auto;">${user.avatar}</div>
            <h2>${user.fullName}</h2>
            <p>@${user.username}</p>
            <p>${user.bio}</p>
            <div style="display:flex;justify-content:center;gap:2rem;margin:1rem 0;">
                <div><strong>${user.postsCount}</strong> posts</div>
                <div><strong>${user.followersCount}</strong> followers</div>
                <div><strong>${user.followingCount}</strong> following</div>
            </div>
            <div style="display:flex;gap:0.5rem;justify-content:center;">
                ${currentUser.username !== username ? `
                    <button class="btn-primary" onclick="followUser('${username}')">Follow</button>
                    <button class="btn-primary" onclick="startDM('${username}')" style="background:#10b981;">💬 Message</button>
                ` : ''}
                <button class="btn-secondary" onclick="backToFeed()">← Back to Feed</button>
            </div>
        </div>
    `;
    displayPosts(posts);
    document.getElementById('storiesContainer').style.display = 'none';
    document.getElementById('createPostBox').style.display = 'none';
}

function backToFeed() { location.reload(); }
function openProfile() { viewProfile(currentUser.username); }

// ---------- DM (Direct Messages) ----------
function openDMs() {
    document.getElementById('dmModal').style.display = 'flex';
    loadConversations();
}
function closeDMs() {
    document.getElementById('dmModal').style.display = 'none';
    currentChatUser = null;
}
async function loadConversations() {
    const res = await fetch(`${API_URL}/conversations/${currentUser.username}`);
    const convs = await res.json();
    document.getElementById('conversationsList').innerHTML = convs.map(c => `
        <div onclick="openChat('${c.user.username}')" style="padding:0.5rem;cursor:pointer;">
            <div style="display:flex;align-items:center;gap:0.5rem;">
                <div class="avatar" style="width:40px;height:40px;">${c.user?.avatar || '😀'}</div>
                <div><strong>${c.user?.fullName}</strong></div>
            </div>
        </div>
    `).join('');
}
async function openChat(username) {
    currentChatUser = username;
    const res = await fetch(`${API_URL}/messages/${currentUser.username}/${username}`);
    const msgs = await res.json();
    const container = document.getElementById('dmMessages');
    if (container) {
        container.innerHTML = msgs.map(m => `
            <div style="margin-bottom:1rem;text-align:${m.from === currentUser.username ? 'right' : 'left'}">
                <div style="display:inline-block;padding:0.5rem 1rem;border-radius:18px;background:${m.from === currentUser.username ? '#6366f1' : '#0f0f13'}">${escapeHtml(m.text)}</div>
            </div>
        `).join('');
        container.scrollTop = container.scrollHeight;
    }
}
async function sendMessage() {
    const input = document.getElementById('dmMessage');
    const text = input?.value.trim();
    if (!text || !currentChatUser) {
        showToast('Select a user and type a message', 'error');
        return;
    }
    await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: currentUser.username, to: currentChatUser, text })
    });
    input.value = '';
    openChat(currentChatUser);
    showToast('Message sent!', 'success');
}

// This is the function that was missing – now it's at the right place (outside viewProfile)
function startDM(username) {
    console.log("startDM called for", username);
    currentChatUser = username;
    openDMs();
    setTimeout(() => {
        openChat(username);
    }, 500);
}

async function searchUsers(query) {
    if (!query.trim()) { loadSuggestions(); return; }
    const res = await fetch(`${API_URL}/users`);
    let users = await res.json();
    users = users.filter(u => u.username.toLowerCase().includes(query.toLowerCase())).slice(0,10);
    document.getElementById('suggestionsList').innerHTML = users.map(u => `
        <div class="suggestion-item" onclick="viewProfile('${u.username}')">
            <div class="avatar" style="width:40px;height:40px;">${u.avatar}</div>
            <div><strong>${u.fullName}</strong><div style="font-size:0.7rem;">@${u.username}</div></div>
        </div>
    `).join('');
}

// ---------- Utils ----------
function timeAgo(date) {
    if (!date) return 'just now';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}
function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}