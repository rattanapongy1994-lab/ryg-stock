// ═══════════════════════════════════════════════════
//  RYG Stock — shared.js  (Firebase + Shell helpers)
// ═══════════════════════════════════════════════════

// ─── Firebase Config ───────────────────────────────
const FC = {
  apiKey: "AIzaSyABKbRCDNh5SHwvbuFtAudLnRYepZfXk7s",
  authDomain: "ryg-stock.firebaseapp.com",
  projectId: "ryg-stock",
  storageBucket: "ryg-stock.firebasestorage.app",
  messagingSenderId: "338213551131",
  appId: "1:338213551131:web:153773df4f8111b2364cbe"
};

// Initialize Firebase only once
if (!firebase.apps.length) firebase.initializeApp(FC);
const auth     = firebase.auth();
const firestore = firebase.firestore();

// ─── Navigation config ────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'หน้าหลัก', icon: '🏠', href: 'index.html',    adminOnly: false },
  { id: 'stock',     label: 'สต็อก',    icon: '📦', href: 'stock.html',    adminOnly: false },
  { id: 'withdraw',  label: 'เบิก',     icon: '📤', href: 'withdraw.html', adminOnly: false },
  { id: 'qr',        label: 'QR',       icon: '📷', href: 'qr.html',       adminOnly: false },
  { id: 'history',   label: 'ประวัติ',  icon: '🕐', href: 'history.html',  adminOnly: false },
  { id: 'users',     label: 'ผู้ใช้',   icon: '👥', href: 'users.html',    adminOnly: true  },
];

// ─── Shell initializer ────────────────────────────
// Usage: initShell('pageid', async (user, role, db) => { ... })
function initShell(pageId, callback) {
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    // Fetch / create user doc in Firestore
    let role = 'user';
    try {
      const userRef = firestore.collection('users').doc(user.uid);
      const snap    = await userRef.get();
      if (snap.exists) {
        role = snap.data().role || 'user';
      } else {
        // First-time login — create user doc
        await userRef.set({
          uid:         user.uid,
          email:       user.email,
          displayName: user.displayName || '',
          photoURL:    user.photoURL    || '',
          role:        'user',
          createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (e) {
      console.warn('User doc error:', e);
    }

    // Render topbar user info
    _renderUserBadge(user, role);
    // Render navigation
    _renderNav(pageId, role);
    // Hide loading, show app
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainApp').style.display       = 'block';

    // Call page callback
    await callback(user, role, firestore);
  });
}

function _renderUserBadge(user, role) {
  const ava  = document.getElementById('uAvatar');
  const fall = document.getElementById('uFallback');
  const name = document.getElementById('uName');
  const roleBadge = document.getElementById('uRole');

  if (ava) {
    if (user.photoURL) { ava.src = user.photoURL; ava.style.display = ''; }
    else { ava.style.display = 'none'; }
  }
  if (fall) {
    if (!user.photoURL) {
      fall.textContent = (user.displayName || user.email || 'U')[0].toUpperCase();
      fall.style.display = '';
    } else { fall.style.display = 'none'; }
  }
  if (name) name.textContent = user.displayName || user.email || '';
  if (roleBadge) {
    roleBadge.textContent = role === 'admin' ? '🔑 Admin' : '👤 User';
    roleBadge.className   = `badge-role ${role === 'admin' ? 'badge-admin' : 'badge-user'}`;
  }
}

function _renderNav(pageId, role) {
  const items = NAV_ITEMS.filter(n => !n.adminOnly || role === 'admin');

  // Top tabs (desktop)
  const navTabs = document.getElementById('navTabs');
  if (navTabs) {
    navTabs.innerHTML = items.map(n =>
      `<a class="nav-tab${n.id === pageId ? ' active' : ''}" href="${n.href}">${n.icon} ${n.label}</a>`
    ).join('');
  }

  // Bottom nav (mobile)
  const bottomNav = document.getElementById('bottomNav');
  if (bottomNav) {
    bottomNav.innerHTML = items.map(n =>
      `<a class="bn-item${n.id === pageId ? ' active' : ''}" href="${n.href}">
        <span class="bn-icon">${n.icon}</span>
        <span class="bn-label">${n.label}</span>
      </a>`
    ).join('');
  }
}

// ─── Navigate helper ──────────────────────────────
function navigate(pageId) {
  const item = NAV_ITEMS.find(n => n.id === pageId);
  if (item) window.location.href = item.href;
}

// ─── Logout ───────────────────────────────────────
function doLogout() {
  auth.signOut().then(() => { window.location.href = 'login.html'; });
}

// ─── Notification toast ───────────────────────────
function showNotif(msg, type = 'ok') {
  const el = document.getElementById('notif');
  if (!el) return;
  el.textContent = msg;
  el.className   = `notif-toast notif-${type} show`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 3000);
}

// ─── Modal helpers ────────────────────────────────
function showModal(html) {
  let overlay = document.getElementById('modalOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modalOverlay';
    overlay.className = 'modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) closeModal(); };
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<div class="modal-sheet">${html}</div>`;
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('open'));
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  setTimeout(() => { overlay.style.display = 'none'; overlay.innerHTML = ''; }, 220);
}

// ─── Date / time utils ────────────────────────────
function todayStr() {
  return new Date().toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function dateStr(date) {
  return date.toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function formatDT(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
    return d.toLocaleString('th-TH', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (e) { return ''; }
}

// ─── Generate service/document number ─────────────
function genNo() {
  const now = new Date();
  const yy  = String(now.getFullYear()).slice(-2);
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const dd  = String(now.getDate()).padStart(2, '0');
  const rnd = String(Math.floor(Math.random() * 9000) + 1000);
  return `WD${yy}${mm}${dd}-${rnd}`;
}

// ─── Item group helpers ───────────────────────────
const GROUP_MAP = {
  Storage:   { label: 'Storage',        icon: '💾' },
  Memory:    { label: 'Memory / RAM',   icon: '🧠' },
  Component: { label: 'Component',      icon: '🔧' },
  Network:   { label: 'Network',        icon: '🌐' },
  Camera:    { label: 'Camera',         icon: '📷' },
  Cable:     { label: 'Cable / Adapter',icon: '🔌' },
  Power:     { label: 'Power Supply',   icon: '⚡' },
  Device:    { label: 'Device',         icon: '🖥️' },
  Other:     { label: 'อื่น ๆ',         icon: '📋' },
};

function getGroupKey(cat) {
  return GROUP_MAP[cat] ? cat : 'Other';
}

function getGroupDef(key) {
  return GROUP_MAP[key] || GROUP_MAP['Other'];
}
