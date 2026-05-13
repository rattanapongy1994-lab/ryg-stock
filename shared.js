// ═══════════════════════════════════════════════════
//  RYG Stock — shared.js  (Firebase + Shell helpers)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
//  THEME SYSTEM — apply on every page load
// ═══════════════════════════════════════════════════
(function(){
  const saved = localStorage.getItem('ryg_theme') || 'ocean';
  document.documentElement.setAttribute('data-theme', saved);
})();

const RYG_THEMES = [
  { id:'ocean',  label:'Ocean',  dot:'#1D9E75', emoji:'🌊' },
  { id:'indigo', label:'Indigo', dot:'#6366f1', emoji:'💜' },
  { id:'rose',   label:'Rose',   dot:'#f43f5e', emoji:'🌹' },
  { id:'amber',  label:'Amber',  dot:'#d97706', emoji:'🌟' },
  { id:'slate',  label:'Dark',   dot:'#64748b', emoji:'🌙' },
];

function applyTheme(id) {
  document.documentElement.setAttribute('data-theme', id);
  localStorage.setItem('ryg_theme', id);
  _renderThemeSwatches();
}

function _toggleThemePanel() {
  let p = document.getElementById('_themePanel');
  if (!p) return;
  const isOpen = p.style.display === 'block';
  p.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) _renderThemeSwatches();
}

function _renderThemeSwatches() {
  const grid = document.getElementById('_themeGrid');
  if (!grid) return;
  const cur = document.documentElement.getAttribute('data-theme') || 'ocean';
  grid.innerHTML = RYG_THEMES.map(t => `
    <div onclick="applyTheme('${t.id}');_toggleThemePanel()" style="
      display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;
      border:2px solid ${t.id===cur?'var(--g)':'transparent'};
      background:${t.id===cur?'var(--gll)':'var(--bg)'};cursor:pointer;
      font-size:12px;font-weight:600;color:var(--tx1);transition:all .15s;">
      <div style="width:16px;height:16px;border-radius:50%;background:${t.dot};flex-shrink:0"></div>
      ${t.emoji} ${t.label}
    </div>`).join('');
}

function _injectThemePanel() {
  // Inject theme panel into body if not on dashboard (dashboard has its own)
  if (document.getElementById('_themePanel')) return;
  const panel = document.createElement('div');
  panel.id = '_themePanel';
  panel.style.cssText = `
    display:none;position:fixed;top:calc(var(--topbar-h) + 8px);right:12px;
    background:var(--surf);border:1px solid var(--bdr);border-radius:16px;
    padding:14px 16px;z-index:300;box-shadow:0 8px 32px rgba(0,0,0,.2);width:230px;`;
  panel.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--tx3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;">🎨 ธีมสี</div>
    <div id="_themeGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;"></div>`;
  document.body.appendChild(panel);
  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && !e.target.closest('[data-theme-btn]')) {
      panel.style.display = 'none';
    }
  }, true);
}

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

  // Inject theme button (for non-dashboard pages; dashboard has its own)
  const userMini = document.querySelector('.user-mini');
  if (userMini && !document.getElementById('_sharedThemeBtn') && !document.querySelector('.theme-btn')) {
    const btn = document.createElement('button');
    btn.id = '_sharedThemeBtn';
    btn.setAttribute('data-theme-btn', '1');
    btn.title = 'เลือกธีมสี';
    btn.onclick = _toggleThemePanel;
    btn.style.cssText = `
      width:30px;height:30px;border-radius:50%;border:2px solid rgba(255,255,255,.4);
      cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
      background:rgba(255,255,255,.15);backdrop-filter:blur(4px);
      transition:transform .2s,box-shadow .2s;flex-shrink:0;`;
    btn.textContent = '🎨';
    btn.onmouseenter = () => { btn.style.transform='scale(1.1)'; btn.style.boxShadow='0 0 0 3px rgba(255,255,255,.2)'; };
    btn.onmouseleave = () => { btn.style.transform=''; btn.style.boxShadow=''; };
    // Insert before logout button
    const logoutBtn = userMini.querySelector('.btn-topout');
    userMini.insertBefore(btn, logoutBtn);
    _injectThemePanel();
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
