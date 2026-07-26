/**
 * IQChat - Main Application Controller & UI Orchestrator
 */

import { listenToAuthState, registerUser, loginUser, logoutUser } from './auth.js';
import { startPresenceSystem, stopPresenceSystem, subscribeToUsersPresence, formatUserPresenceText } from './presence.js';
import { 
  setActiveChatPeer, getActiveChatPeer, subscribeToMessages, 
  sendTextMessage, sendImageMessage, processImageFile, formatMessageTime 
} from './chat.js';
import { isFirebaseReady } from './firebase-config.js';
import { 
  loadSavedTheme, applyTheme, applyAccent, getCurrentTheme, getCurrentAccent,
  updateDisplayName, updateUserAvatar, changePassword 
} from './settings.js';
import { subscribeToStories, createStory, deleteStory, getTimeAgo } from './stories.js';

// === DOM Elements ===
const authScreen = document.getElementById('authScreen');
const usersScreen = document.getElementById('usersScreen');
const chatScreen = document.getElementById('chatScreen');
const settingsScreen = document.getElementById('settingsScreen');

const userHeaderProfile = document.getElementById('userHeaderProfile');
const headerAvatar = document.getElementById('headerAvatar');
const logoutBtn = document.getElementById('logoutBtn');
const openSettingsBtn = document.getElementById('openSettingsBtn');

const tabLoginBtn = document.getElementById('tabLoginBtn');
const tabRegisterBtn = document.getElementById('tabRegisterBtn');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authAlert = document.getElementById('authAlert');

const avatarPicker = document.getElementById('avatarPicker');
const customAvatarBtn = document.getElementById('customAvatarBtn');
const customAvatarInput = document.getElementById('customAvatarInput');
let selectedAvatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=IQUser1';

const searchUsersInput = document.getElementById('searchUsersInput');
const filterPills = document.querySelectorAll('.pill-btn');
const usersList = document.getElementById('usersList');
const onlineHorizontalList = document.getElementById('onlineHorizontalList');
const totalUsersCount = document.getElementById('totalUsersCount');
const onlineUsersCount = document.getElementById('onlineUsersCount');

const closeChatBtn = document.getElementById('closeChatBtn');
const chatTargetAvatar = document.getElementById('chatTargetAvatar');
const chatTargetStatus = document.getElementById('chatTargetStatus');
const chatTargetName = document.getElementById('chatTargetName');
const chatTargetSubtext = document.getElementById('chatTargetSubtext');
const messagesContainer = document.getElementById('messagesContainer');
const emptyChatNotice = document.getElementById('emptyChatNotice');

const chatForm = document.getElementById('chatForm');
const messageTextInput = document.getElementById('messageTextInput');
const attachImageBtn = document.getElementById('attachImageBtn');
const imageFileInput = document.getElementById('imageFileInput');
const imagePreviewOverlay = document.getElementById('imagePreviewOverlay');
const previewImageElement = document.getElementById('previewImageElement');
const cancelImagePreviewBtn = document.getElementById('cancelImagePreviewBtn');
const sendImagePreviewBtn = document.getElementById('sendImagePreviewBtn');
let pendingImageBase64 = null;

const lightboxModal = document.getElementById('lightboxModal');
const lightboxImage = document.getElementById('lightboxImage');
const closeLightboxBtn = document.getElementById('closeLightboxBtn');

// Settings DOM
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsAvatar = document.getElementById('settingsAvatar');
const settingsAvatarWrapper = document.getElementById('settingsAvatarWrapper');
const settingsAvatarInput = document.getElementById('settingsAvatarInput');
const settingsUserName = document.getElementById('settingsUserName');
const settingsUserEmail = document.getElementById('settingsUserEmail');
const themeToggle = document.getElementById('themeToggle');
const colorOptions = document.getElementById('colorOptions');
const changeNameForm = document.getElementById('changeNameForm');
const changePasswordForm = document.getElementById('changePasswordForm');
const nameAlert = document.getElementById('nameAlert');
const passwordAlert = document.getElementById('passwordAlert');

// Stories DOM
const storiesScroll = document.getElementById('storiesScroll');
const addStoryBtn = document.getElementById('addStoryBtn');
const storyCreateModal = document.getElementById('storyCreateModal');
const closeStoryCreateBtn = document.getElementById('closeStoryCreateBtn');
const storyImagePicker = document.getElementById('storyImagePicker');
const storyImageInput = document.getElementById('storyImageInput');
const storyImagePreview = document.getElementById('storyImagePreview');
const storyPreviewImg = document.getElementById('storyPreviewImg');
const storyTextInput = document.getElementById('storyTextInput');
const publishStoryBtn = document.getElementById('publishStoryBtn');

const storyViewer = document.getElementById('storyViewer');
const storyViewerAvatar = document.getElementById('storyViewerAvatar');
const storyViewerName = document.getElementById('storyViewerName');
const storyViewerTime = document.getElementById('storyViewerTime');
const storyViewerImage = document.getElementById('storyViewerImage');
const storyViewerText = document.getElementById('storyViewerText');
const deleteStoryBtn = document.getElementById('deleteStoryBtn');
const closeStoryViewerBtn = document.getElementById('closeStoryViewerBtn');
const storyProgressBar = document.getElementById('storyProgressBar');

// === App State ===
let me = null;
let allUsersCache = [];
let currentFilter = 'all';
let activeMessagesUnsubscribe = null;
let activeUsersUnsubscribe = null;
let activeStoriesUnsubscribe = null;
let allStoriesCache = [];
let pendingStoryImage = null;
let storyViewTimer = null;

// === Initialize ===
document.addEventListener('DOMContentLoaded', () => {
  loadSavedTheme();
  setupEventListeners();
  checkAppSetup();
});

function checkAppSetup() {
  if (!isFirebaseReady()) {
    alert("لم يتم الاتصال بـ Firebase. تأكد من تفعيل Authentication و Firestore.");
  }
  listenToAuthState((user) => {
    if (user) {
      onUserLoggedIn(user);
    } else {
      userHeaderProfile.style.display = 'none';
      showScreen(authScreen);
    }
  });
}

function onUserLoggedIn(user) {
  me = user;
  headerAvatar.src = user.avatar || selectedAvatarUrl;
  userHeaderProfile.style.display = 'flex';
  startPresenceSystem(user.id);
  showScreen(usersScreen);

  if (activeUsersUnsubscribe) activeUsersUnsubscribe();
  activeUsersUnsubscribe = subscribeToUsersPresence(user.id, (users) => {
    allUsersCache = users;
    renderUsersList();
  });

  if (activeStoriesUnsubscribe) activeStoriesUnsubscribe();
  activeStoriesUnsubscribe = subscribeToStories((stories) => {
    allStoriesCache = stories;
    renderStories();
  });

  // Re-evaluate online presence every 30 seconds
  setInterval(renderUsersList, 30000);

  // Update settings screen info
  settingsAvatar.src = user.avatar || selectedAvatarUrl;
  settingsUserName.textContent = user.name;
  settingsUserEmail.textContent = user.email;
  themeToggle.checked = getCurrentTheme() === 'dark';
  
  // Mark active color
  document.querySelectorAll('.color-opt').forEach(o => {
    o.classList.toggle('selected', o.getAttribute('data-color') === getCurrentAccent());
  });
}

function showScreen(targetScreen) {
  [authScreen, usersScreen, chatScreen, settingsScreen].forEach(s => {
    if (s) s.classList.remove('active');
  });
  if (targetScreen) targetScreen.classList.add('active');
}

// === Event Listeners ===
function setupEventListeners() {
  // Auth tabs
  tabLoginBtn.addEventListener('click', () => {
    tabLoginBtn.classList.add('active'); tabRegisterBtn.classList.remove('active');
    loginForm.style.display = 'block'; registerForm.style.display = 'none';
    loginForm.classList.add('active'); registerForm.classList.remove('active');
    hideAuthAlert();
  });
  tabRegisterBtn.addEventListener('click', () => {
    tabRegisterBtn.classList.add('active'); tabLoginBtn.classList.remove('active');
    registerForm.style.display = 'block'; loginForm.style.display = 'none';
    registerForm.classList.add('active'); loginForm.classList.remove('active');
    hideAuthAlert();
  });

  // Avatar picker
  avatarPicker.addEventListener('click', (e) => {
    const opt = e.target.closest('.avatar-opt');
    if (opt) {
      document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedAvatarUrl = opt.getAttribute('data-avatar');
    }
  });
  customAvatarBtn.addEventListener('click', () => customAvatarInput.click());
  customAvatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await processImageFile(file);
        selectedAvatarUrl = base64;
        const newOpt = document.createElement('div');
        newOpt.className = 'avatar-opt selected';
        newOpt.setAttribute('data-avatar', base64);
        newOpt.innerHTML = `<img src="${base64}">`;
        document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('selected'));
        avatarPicker.insertBefore(newOpt, customAvatarBtn);
      } catch (err) { showAuthAlert('فشل معالجة الصورة', 'error'); }
    }
  });

  // Password toggle
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.innerHTML = input.type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
    });
  });

  // Register
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault(); hideAuthAlert();
    const btn = document.getElementById('registerSubmitBtn');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الإنشاء...';
    try {
      const res = await registerUser({
        name: document.getElementById('regName').value.trim(),
        email: document.getElementById('regEmail').value.trim(),
        password: document.getElementById('regPassword').value,
        avatar: selectedAvatarUrl
      });
      if (!res.success) showAuthAlert(res.error, 'error');
    } catch (err) { showAuthAlert('خطأ: ' + (err.message || err), 'error'); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
  });

  // Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); hideAuthAlert();
    const btn = document.getElementById('loginSubmitBtn');
    const orig = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الدخول...';
    try {
      const res = await loginUser({
        email: document.getElementById('loginEmail').value.trim(),
        password: document.getElementById('loginPassword').value
      });
      if (!res.success) showAuthAlert(res.error, 'error');
    } catch (err) { showAuthAlert('خطأ: ' + (err.message || err), 'error'); }
    finally { btn.disabled = false; btn.innerHTML = orig; }
  });

  // Logout
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (me) stopPresenceSystem(me.id);
    me = null;
    userHeaderProfile.style.display = 'none';
    showScreen(authScreen);
    await logoutUser();
  });

  // Search & Filters
  searchUsersInput.addEventListener('input', renderUsersList);
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentFilter = pill.getAttribute('data-filter');
      renderUsersList();
    });
  });

  // Chat
  closeChatBtn.addEventListener('click', () => {
    if (activeMessagesUnsubscribe) activeMessagesUnsubscribe();
    setActiveChatPeer(null);
    showScreen(usersScreen);
  });

  attachImageBtn.addEventListener('click', () => imageFileInput.click());
  imageFileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        pendingImageBase64 = await processImageFile(file);
        previewImageElement.src = pendingImageBase64;
        imagePreviewOverlay.style.display = 'block';
      } catch (err) { alert('فشل اختيار الصورة'); }
    }
  });
  cancelImagePreviewBtn.addEventListener('click', () => {
    pendingImageBase64 = null; imagePreviewOverlay.style.display = 'none'; imageFileInput.value = '';
  });
  sendImagePreviewBtn.addEventListener('click', async () => {
    const peer = getActiveChatPeer();
    if (peer && pendingImageBase64) {
      await sendImageMessage(me.id, peer.id, pendingImageBase64);
      pendingImageBase64 = null; imagePreviewOverlay.style.display = 'none'; imageFileInput.value = '';
    }
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = messageTextInput.value;
    const peer = getActiveChatPeer();
    if (text && text.trim() && peer) {
      messageTextInput.value = '';
      await sendTextMessage(me.id, peer.id, text);
    }
  });

  // Lightbox
  closeLightboxBtn.addEventListener('click', () => lightboxModal.style.display = 'none');
  lightboxModal.addEventListener('click', (e) => {
    if (e.target === lightboxModal) lightboxModal.style.display = 'none';
  });

  // === SETTINGS ===
  openSettingsBtn.addEventListener('click', () => {
    if (me) {
      settingsAvatar.src = me.avatar || selectedAvatarUrl;
      settingsUserName.textContent = me.name;
      settingsUserEmail.textContent = me.email;
      document.getElementById('newNameInput').value = me.name;
    }
    showScreen(settingsScreen);
  });

  closeSettingsBtn.addEventListener('click', () => showScreen(usersScreen));

  // Theme toggle
  themeToggle.addEventListener('change', () => {
    applyTheme(themeToggle.checked ? 'dark' : 'light');
  });

  // Color accent
  colorOptions.addEventListener('click', (e) => {
    const opt = e.target.closest('.color-opt');
    if (opt) {
      document.querySelectorAll('.color-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      applyAccent(opt.getAttribute('data-color'));
    }
  });

  // Change name
  changeNameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newName = document.getElementById('newNameInput').value.trim();
    if (!newName) return;
    const res = await updateDisplayName(newName);
    if (res.success) {
      me.name = newName;
      settingsUserName.textContent = newName;
      showSettingsAlert(nameAlert, 'تم تغيير الاسم بنجاح ✅', 'success');
    } else {
      showSettingsAlert(nameAlert, res.error, 'error');
    }
  });

  // Change password
  changePasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cur = document.getElementById('currentPasswordInput').value;
    const nw = document.getElementById('newPasswordInput').value;
    if (!cur || !nw) return;
    const res = await changePassword(cur, nw);
    if (res.success) {
      showSettingsAlert(passwordAlert, 'تم تغيير كلمة السر بنجاح ✅', 'success');
      changePasswordForm.reset();
    } else {
      showSettingsAlert(passwordAlert, res.error, 'error');
    }
  });

  // Change avatar
  settingsAvatarWrapper.addEventListener('click', () => settingsAvatarInput.click());
  settingsAvatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await processImageFile(file);
        const res = await updateUserAvatar(base64);
        if (res.success) {
          me.avatar = base64;
          settingsAvatar.src = base64;
          headerAvatar.src = base64;
        }
      } catch (err) { console.error('Avatar update error:', err); }
    }
  });

  // === STORIES ===
  addStoryBtn.addEventListener('click', () => {
    pendingStoryImage = null;
    storyImagePreview.style.display = 'none';
    storyImagePicker.style.display = 'flex';
    storyTextInput.value = '';
    storyCreateModal.style.display = 'flex';
  });

  closeStoryCreateBtn.addEventListener('click', () => storyCreateModal.style.display = 'none');

  storyImagePicker.addEventListener('click', () => storyImageInput.click());
  storyImageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        pendingStoryImage = await processImageFile(file);
        storyPreviewImg.src = pendingStoryImage;
        storyImagePreview.style.display = 'block';
        storyImagePicker.style.display = 'none';
      } catch (err) { alert('فشل تحميل الصورة'); }
    }
  });

  publishStoryBtn.addEventListener('click', async () => {
    if (!pendingStoryImage || !me) return;
    publishStoryBtn.disabled = true;
    publishStoryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري النشر...';
    const res = await createStory(me.id, me.name, me.avatar, pendingStoryImage, storyTextInput.value.trim());
    if (res.success) {
      storyCreateModal.style.display = 'none';
      pendingStoryImage = null;
    } else {
      alert('فشل نشر القصة: ' + res.error);
    }
    publishStoryBtn.disabled = false;
    publishStoryBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> نشر القصة';
  });

  // Story viewer
  closeStoryViewerBtn.addEventListener('click', closeStoryViewer);
  deleteStoryBtn.addEventListener('click', async () => {
    const storyId = deleteStoryBtn.getAttribute('data-story-id');
    if (storyId) {
      await deleteStory(storyId);
      closeStoryViewer();
    }
  });
}

// === STORIES RENDERING ===
function renderStories() {
  // Group stories by user
  const userStories = {};
  allStoriesCache.forEach(s => {
    if (!userStories[s.userId]) {
      userStories[s.userId] = { user: { name: s.userName, avatar: s.userAvatar, id: s.userId }, stories: [] };
    }
    userStories[s.userId].stories.push(s);
  });

  // Keep the add button, then add user story circles
  let html = `
    <div class="story-add-btn" id="addStoryBtnDynamic">
      <div class="story-circle add-circle"><i class="fa-solid fa-plus"></i></div>
      <span>قصتي</span>
    </div>
  `;

  Object.values(userStories).forEach(({ user, stories }) => {
    html += `
      <div class="story-user-circle" data-story-user="${user.id}">
        <div class="story-circle has-story">
          <img src="${user.avatar}" alt="${user.name}">
        </div>
        <span>${user.name.split(' ')[0]}</span>
      </div>
    `;
  });

  storiesScroll.innerHTML = html;

  // Re-bind add story button
  const dynamicAddBtn = document.getElementById('addStoryBtnDynamic');
  if (dynamicAddBtn) {
    dynamicAddBtn.addEventListener('click', () => {
      pendingStoryImage = null;
      storyImagePreview.style.display = 'none';
      storyImagePicker.style.display = 'flex';
      storyTextInput.value = '';
      storyCreateModal.style.display = 'flex';
    });
  }

  // Bind story circles
  document.querySelectorAll('.story-user-circle').forEach(el => {
    el.addEventListener('click', () => {
      const userId = el.getAttribute('data-story-user');
      const userData = userStories[userId];
      if (userData && userData.stories.length > 0) {
        openStoryViewer(userData.stories[0], userData.user);
      }
    });
  });
}

function openStoryViewer(story, user) {
  storyViewerAvatar.src = user.avatar;
  storyViewerName.textContent = user.name;
  storyViewerTime.textContent = getTimeAgo(story.createdAt);
  storyViewerImage.src = story.imageData;
  storyViewerText.textContent = story.text || '';
  storyViewerText.style.display = story.text ? 'block' : 'none';

  if (me && story.userId === me.id) {
    deleteStoryBtn.style.display = 'block';
    deleteStoryBtn.setAttribute('data-story-id', story.id);
  } else {
    deleteStoryBtn.style.display = 'none';
  }

  storyViewer.style.display = 'flex';

  // Progress bar animation (5 seconds)
  storyProgressBar.style.width = '0%';
  storyProgressBar.style.transition = 'none';
  requestAnimationFrame(() => {
    storyProgressBar.style.transition = 'width 5s linear';
    storyProgressBar.style.width = '100%';
  });

  if (storyViewTimer) clearTimeout(storyViewTimer);
  storyViewTimer = setTimeout(() => closeStoryViewer(), 5000);
}

function closeStoryViewer() {
  storyViewer.style.display = 'none';
  if (storyViewTimer) { clearTimeout(storyViewTimer); storyViewTimer = null; }
}

// === USERS LIST ===
function renderUsersList() {
  const queryText = searchUsersInput.value.toLowerCase().trim();
  const now = Date.now();
  
  // Recalculate true online status (missed heartbeat = offline)
  allUsersCache.forEach(u => {
    if (u.isOnline && u.lastSeen && (now - u.lastSeen > 120000)) {
      u.isOnline = false;
    }
  });

  let filtered = allUsersCache.filter(u => {
    const match = u.name.toLowerCase().includes(queryText) || (u.email && u.email.toLowerCase().includes(queryText));
    return currentFilter === 'online' ? match && u.isOnline : match;
  });

  totalUsersCount.textContent = allUsersCache.length;
  onlineUsersCount.textContent = allUsersCache.filter(u => u.isOnline).length;

  // Online horizontal bar
  const onlineUsers = allUsersCache.filter(u => u.isOnline);
  onlineHorizontalList.innerHTML = onlineUsers.length === 0
    ? '<div style="font-size:0.78rem;color:var(--text-dim);padding:4px;">لا يوجد متصلون حالياً</div>'
    : onlineUsers.map(u => `
        <div class="horizontal-user-card" data-user-id="${u.id}">
          <div class="avatar-wrapper"><img src="${u.avatar}" alt="${u.name}"><span class="status-indicator online"></span></div>
          <span>${u.name}</span>
        </div>`).join('');

  // Users list
  if (filtered.length === 0) {
    usersList.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-dim);font-size:0.9rem;">لا توجد حسابات مسجلة حالياً</div>';
    return;
  }

  usersList.innerHTML = filtered.map(u => {
    const sc = u.isOnline ? 'online' : 'offline';
    return `
      <div class="user-item" data-user-id="${u.id}">
        <div class="avatar-wrapper"><img src="${u.avatar}" alt="${u.name}"><span class="status-indicator ${sc}"></span></div>
        <div class="user-item-info">
          <div class="user-item-header">
            <h4 class="user-item-name">${u.name}</h4>
            <span class="user-item-time">${u.isOnline ? 'أونلاين' : ''}</span>
          </div>
          <p class="user-item-lastmsg"><i class="fa-regular fa-comment-dots" style="font-size:0.75rem;"></i> <span>${formatUserPresenceText(u)}</span></p>
        </div>
      </div>`;
  }).join('');

  document.querySelectorAll('[data-user-id]').forEach(el => {
    el.addEventListener('click', () => {
      const user = allUsersCache.find(u => u.id === el.getAttribute('data-user-id'));
      if (user) openChatWithUser(user);
    });
  });
}

function openChatWithUser(target) {
  setActiveChatPeer(target);
  chatTargetAvatar.src = target.avatar;
  chatTargetName.textContent = target.name;
  if (target.isOnline) {
    chatTargetStatus.className = 'status-indicator online';
    chatTargetSubtext.textContent = 'متصل الآن';
    chatTargetSubtext.style.color = 'var(--status-online)';
  } else {
    chatTargetStatus.className = 'status-indicator offline';
    chatTargetSubtext.textContent = formatUserPresenceText(target);
    chatTargetSubtext.style.color = 'var(--text-muted)';
  }
  showScreen(chatScreen);
  if (activeMessagesUnsubscribe) activeMessagesUnsubscribe();
  activeMessagesUnsubscribe = subscribeToMessages(me.id, target.id, renderMessagesFeed);
}

function renderMessagesFeed(messages) {
  if (!messages || messages.length === 0) {
    messagesContainer.innerHTML = '';
    messagesContainer.appendChild(emptyChatNotice);
    emptyChatNotice.style.display = 'block';
    return;
  }
  emptyChatNotice.style.display = 'none';
  messagesContainer.innerHTML = messages.map(msg => {
    const mine = msg.senderId === me.id;
    const cls = mine ? 'sent' : 'received';
    let content = '';
    if (msg.type === 'image' || msg.imageUrl) {
      content = `<div class="message-image-attachment" onclick="window.openLightbox('${msg.imageUrl}')"><img src="${msg.imageUrl}" alt="صورة" loading="lazy"></div>`;
    }
    if (msg.text) content += `<div class="message-text">${escapeHtml(msg.text)}</div>`;
    return `
      <div class="message-bubble-wrapper ${cls}"><div class="message-bubble">${content}
        <div class="message-info"><span>${formatMessageTime(msg.timestamp)}</span>
        ${mine ? '<i class="fa-solid fa-check-double" style="font-size:0.7rem;color:#A7F3D0;"></i>' : ''}</div>
      </div></div>`;
  }).join('');
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

window.openLightbox = function(url) {
  lightboxImage.src = url;
  lightboxModal.style.display = 'flex';
};

// === Helpers ===
function showAuthAlert(msg, type = 'error') {
  authAlert.textContent = msg;
  authAlert.className = `auth-alert ${type}`;
  authAlert.style.display = 'block';
}
function hideAuthAlert() { authAlert.style.display = 'none'; }

function showSettingsAlert(el, msg, type) {
  el.textContent = msg;
  el.className = `settings-alert ${type}`;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

function escapeHtml(s) {
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
}
