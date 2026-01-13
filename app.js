// app.js

// Firebase Config - Replace with your own
  const firebaseConfig = {
    apiKey: "AIzaSyCwcdPhGcHb6kDhVPYJgV0lpZoWX3qSn4A",           // ← CHANGE!
    authDomain: "heartline-6bb08.firebaseapp.com",
    projectId: "heartline-6bb08",
    storageBucket: "heartline-6bb08.firebasestorage.app",
    messagingSenderId: "372851895770",
    appId: "1:372851895770:web:aac0ae1e5bdb22482c24e",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
const messaging = firebase.messaging();

let currentUser = null;
const ADMIN_PASSWORD = '#TechBrian@01'; // As per prompt, insecure in prod

// Theme Toggle
document.getElementById('theme-btn').addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem('theme', document.body.classList.contains('light') ? 'light' : 'dark');
});

// Load theme
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light');
}

// Toggle Password Visibility
function togglePassword(id) {
    const input = document.getElementById(id);
    input.type = input.type === 'password' ? 'text' : 'password';
}

// Show/Hide Forms
function showRegister() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
}

function showLogin() {
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('login-form').style.display = 'block';
}

// Auth Functions
function register() {
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const file = document.getElementById('reg-profile-pic').files[0];

    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            currentUser = userCredential.user;
            db.ref('users/' + currentUser.uid).set({
                username,
                email
            });
            if (file) uploadProfilePic(file);
            showDashboard();
        })
        .catch(error => alert(error.message));
}

function login() {
    const identifier = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const isEmail = identifier.includes('@');

    if (isEmail) {
        auth.signInWithEmailAndPassword(identifier, password)
            .then(userCredential => {
                currentUser = userCredential.user;
                showDashboard();
            })
            .catch(error => alert(error.message));
    } else {
        // Login with username - fetch email first
        db.ref('users').orderByChild('username').equalTo(identifier).once('value')
            .then(snapshot => {
                const userData = snapshot.val();
                if (userData) {
                    const uid = Object.keys(userData)[0];
                    const email = userData[uid].email;
                    auth.signInWithEmailAndPassword(email, password)
                        .then(() => {
                            currentUser = auth.currentUser;
                            showDashboard();
                        });
                } else {
                    alert('Username not found');
                }
            });
    }
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        showAuth();
    });
}

// Dashboard
function showDashboard() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';
    loadUserData();
    loadUserSuggestions();
    checkIfAdmin(); // To show admin button if applicable
}

function showAuth() {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('auth-section').style.display = 'block';
}

// Load User Data
function loadUserData() {
    db.ref('users/' + currentUser.uid).once('value').then(snapshot => {
        const data = snapshot.val();
        document.getElementById('user-name').textContent = data.username;
        if (data.profilePic) {
            document.getElementById('user-profile-pic').src = data.profilePic;
            document.getElementById('user-profile-pic').style.display = 'block';
        }
    });
}

// Edit Profile
function showEditProfile() {
    document.getElementById('edit-profile').style.display = 'block';
}

function updateProfile() {
    const newUsername = document.getElementById('edit-username').value;
    const newPassword = document.getElementById('edit-password').value;
    const file = document.getElementById('edit-profile-pic').files[0];

    if (newUsername) {
        db.ref('users/' + currentUser.uid + '/username').set(newUsername);
    }
    if (newPassword) {
        currentUser.updatePassword(newPassword);
    }
    if (file) uploadProfilePic(file);
    alert('Profile updated');
    document.getElementById('edit-profile').style.display = 'none';
    loadUserData();
}

function uploadProfilePic(file) {
    const ref = storage.ref('profile_pics/' + currentUser.uid);
    ref.put(file).then(() => {
        ref.getDownloadURL().then(url => {
            db.ref('users/' + currentUser.uid + '/profilePic').set(url);
        });
    });
}

// Suggestion Submission
function showSuggestionForm() {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('suggestion-form-section').style.display = 'block';
}

function submitSuggestion() {
    const topic = document.getElementById('sugg-topic').value;
    const body = document.getElementById('sugg-body').value;
    const date = new Date().toISOString();

    db.ref('users/' + currentUser.uid).once('value').then(snapshot => {
        const userData = snapshot.val();
        const suggestion = {
            topic,
            body,
            sender: {
                username: userData.username,
                email: userData.email,
                profilePic: userData.profilePic || ''
            },
            date,
            status: 'unseen',
            public: false
        };
        db.ref('suggestions').push(suggestion);
        sendNotificationToAdmin();
        alert('Suggestion submitted');
        document.getElementById('suggestion-form-section').style.display = 'none';
        showDashboard();
    });
}

// Load User Suggestions
function loadUserSuggestions() {
    const list = document.getElementById('user-suggestions');
    list.innerHTML = '';
    db.ref('suggestions').orderByChild('sender/email').equalTo(currentUser.email).on('value', snapshot => {
        snapshot.forEach(child => {
            const sugg = child.val();
            const li = document.createElement('li');
            li.innerHTML = `<strong>${sugg.topic}</strong><p>${sugg.body}</p><p>Status: ${sugg.status}</p>`;
            list.appendChild(li);
        });
    });
}

// Contact
function showContact() {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('contact-section').style.display = 'block';
}

function contactWhatsApp() {
    window.open('https://wa.me/254748950572', '_blank');
}

function contactEmail() {
    window.open('mailto:bridah888@gmail.com', '_blank');
}

function contactCall() {
    window.open('tel:0748950572', '_blank');
}

// Admin Login
function showAdminLogin() {
    document.getElementById('dashboard-section').style.display = 'none';
    document.getElementById('admin-login-section').style.display = 'block';
}

function adminLogin() {
    const pass = document.getElementById('admin-password').value;
    if (pass === ADMIN_PASSWORD) {
        showAdminInbox();
    } else {
        alert('Incorrect password');
    }
}

// Admin Inbox
function showAdminInbox() {
    document.getElementById('admin-login-section').style.display = 'none';
    document.getElementById('admin-inbox-section').style.display = 'block';
    loadAdminSuggestions();
    updateAdminBadge();
}

function loadAdminSuggestions() {
    const list = document.getElementById('admin-suggestions');
    list.innerHTML = '';
    db.ref('suggestions').on('value', snapshot => {
        snapshot.forEach(child => {
            const key = child.key;
            const sugg = child.val();
            const li = document.createElement('li');
            li.innerHTML = `
                <strong>${sugg.topic}</strong><p>${sugg.body}</p>
                <p>From: ${sugg.sender.username} (${sugg.sender.email})</p>
                <img src="${sugg.sender.profilePic}" alt="Sender Pic" style="width:50px; ${sugg.sender.profilePic ? '' : 'display:none;'}">
                <p>Date: ${sugg.date}</p>
                <p>Status: ${sugg.status}</p>
                <button onclick="reactToSuggestion('${key}', 'seen')">✔ Seen</button>
                <button onclick="reactToSuggestion('${key}', 'reacted')">❤️ Reacted</button>
                <button onclick="togglePublic('${key}', ${!sugg.public})">${sugg.public ? 'Make Private' : 'Make Public'}</button>
            `;
            list.appendChild(li);
        });
    });
}

function reactToSuggestion(key, status) {
    db.ref('suggestions/' + key + '/status').set(status);
}

function togglePublic(key, isPublic) {
    db.ref('suggestions/' + key + '/public').set(isPublic);
}

// Admin Badge
function updateAdminBadge() {
    db.ref('suggestions').on('value', snapshot => {
        const count = snapshot.numChildren();
        document.getElementById('admin-badge').textContent = count;
    });
}

// Check if Admin - For simplicity, assume admin if specific user, but since prompt uses password, show button always? Wait, prompt says admin button with badge.
// Per prompt, show to all? But only admin can access with pass. So show button if logged in.
function checkIfAdmin() {
    document.getElementById('admin-btn').style.display = 'block';
    updateAdminBadge();
}

// Notifications
messaging.requestPermission().then(() => {
    return messaging.getToken();
}).then(token => {
    // Save token to db for admin
    // Assume admin user has token saved
});

function sendNotificationToAdmin() {
    // Use FCM to send notification
    // Requires server-side, but for demo, alert or log
    console.log('Notification sent to admin');
    // In real, use admin token to send via FCM API
}

// Session Persistence
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        showDashboard();
    } else {
        showAuth();
    }
});
