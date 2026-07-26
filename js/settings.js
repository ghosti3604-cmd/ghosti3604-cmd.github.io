/**
 * IQChat - Settings & Theme Manager
 */

import { firebaseServices, isFirebaseReady } from './firebase-config.js';
import { 
  updateProfile, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const THEME_KEY = 'iqchat_theme';
const ACCENT_KEY = 'iqchat_accent';

const darkVars = {
  '--bg-primary': '#0B0E14',
  '--bg-secondary': '#131720',
  '--bg-tertiary': '#1A1F2E',
  '--glass-bg': 'rgba(20, 25, 40, 0.75)',
  '--glass-border': 'rgba(255,255,255,0.06)',
  '--text-primary': '#F0F2F5',
  '--text-secondary': '#B0B8C8',
  '--text-muted': '#6B7A90',
  '--text-dim': '#4A5568',
  '--border-color': 'rgba(255,255,255,0.08)',
  '--msg-sent-bg': 'rgba(124, 58, 237, 0.25)',
  '--msg-recv-bg': 'rgba(30, 38, 55, 0.85)',
  '--input-bg': 'rgba(15, 20, 35, 0.6)',
  '--shadow-color': 'rgba(0,0,0,0.3)'
};

const lightVars = {
  '--bg-primary': '#F0F2F5',
  '--bg-secondary': '#FFFFFF',
  '--bg-tertiary': '#E4E6EB',
  '--glass-bg': 'rgba(255, 255, 255, 0.85)',
  '--glass-border': 'rgba(0,0,0,0.08)',
  '--text-primary': '#1C1E21',
  '--text-secondary': '#606770',
  '--text-muted': '#8A8D91',
  '--text-dim': '#BCC0C4',
  '--border-color': 'rgba(0,0,0,0.1)',
  '--msg-sent-bg': 'rgba(124, 58, 237, 0.15)',
  '--msg-recv-bg': 'rgba(228, 230, 235, 0.85)',
  '--input-bg': 'rgba(228, 230, 235, 0.6)',
  '--shadow-color': 'rgba(0,0,0,0.08)'
};

const accents = {
  purple: { '--accent-primary': '#7C3AED', '--accent-hover': '#6D28D9', '--accent-glow': 'rgba(124, 58, 237, 0.4)' },
  blue:   { '--accent-primary': '#3B82F6', '--accent-hover': '#2563EB', '--accent-glow': 'rgba(59, 130, 246, 0.4)' },
  green:  { '--accent-primary': '#10B981', '--accent-hover': '#059669', '--accent-glow': 'rgba(16, 185, 129, 0.4)' },
  red:    { '--accent-primary': '#EF4444', '--accent-hover': '#DC2626', '--accent-glow': 'rgba(239, 68, 68, 0.4)' },
  orange: { '--accent-primary': '#F59E0B', '--accent-hover': '#D97706', '--accent-glow': 'rgba(245, 158, 11, 0.4)' },
  pink:   { '--accent-primary': '#EC4899', '--accent-hover': '#DB2777', '--accent-glow': 'rgba(236, 72, 153, 0.4)' },
};

function setVars(vars) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function applyTheme(name) {
  setVars(name === 'light' ? lightVars : darkVars);
  document.body.className = name === 'light' ? 'light-theme' : 'dark-theme';
  localStorage.setItem(THEME_KEY, name);
}

export function applyAccent(name) {
  const vars = accents[name];
  if (vars) {
    setVars(vars);
    localStorage.setItem(ACCENT_KEY, name);
  }
}

export function loadSavedTheme() {
  const theme = localStorage.getItem(THEME_KEY) || 'dark';
  const accent = localStorage.getItem(ACCENT_KEY) || 'purple';
  applyTheme(theme);
  applyAccent(accent);
  return { theme, accent };
}

export function getCurrentTheme() {
  return localStorage.getItem(THEME_KEY) || 'dark';
}

export function getCurrentAccent() {
  return localStorage.getItem(ACCENT_KEY) || 'purple';
}

export async function updateDisplayName(newName) {
  if (!isFirebaseReady()) return { success: false, error: 'Firebase غير متصل' };
  try {
    const user = firebaseServices.auth.currentUser;
    if (!user) return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
    await updateProfile(user, { displayName: newName });
    const userRef = doc(firebaseServices.db, 'users', user.uid);
    await updateDoc(userRef, { name: newName });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updateUserAvatar(avatarUrl) {
  if (!isFirebaseReady()) return { success: false, error: 'Firebase غير متصل' };
  try {
    const user = firebaseServices.auth.currentUser;
    if (!user) return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
    await updateProfile(user, { photoURL: avatarUrl });
    const userRef = doc(firebaseServices.db, 'users', user.uid);
    await updateDoc(userRef, { avatar: avatarUrl });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function changePassword(currentPwd, newPwd) {
  if (!isFirebaseReady()) return { success: false, error: 'Firebase غير متصل' };
  try {
    const user = firebaseServices.auth.currentUser;
    if (!user) return { success: false, error: 'يرجى تسجيل الدخول أولاً' };
    const cred = EmailAuthProvider.credential(user.email, currentPwd);
    await reauthenticateWithCredential(user, cred);
    await updatePassword(user, newPwd);
    return { success: true };
  } catch (err) {
    if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential')
      return { success: false, error: 'كلمة السر الحالية غير صحيحة' };
    if (err.code === 'auth/weak-password')
      return { success: false, error: 'كلمة السر الجديدة ضعيفة (6 أحرف على الأقل)' };
    return { success: false, error: err.message };
  }
}
