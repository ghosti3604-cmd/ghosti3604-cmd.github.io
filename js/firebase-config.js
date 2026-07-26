/**
 * IQChat - Firebase Configuration & Initialization Manager
 * 
 * Strict Firebase Integration (Auth, Firestore, Storage)
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const FB_CONFIG_STORAGE_KEY = 'iqchat_firebase_config';

/**
 * 💡 تلميح: يمكنك كتابة بيانات مشروعك في Firebase مباشرة هنا لتعمل تلقائياً في ملف الـ APK عند جميع المستخدمين بدون ظهور نافذة الإعدادات!
 */
export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD686LAq1oGsJJbwj0oAuM98J2GVIQD6VY",
  authDomain: "iqchat-95635.firebaseapp.com",
  projectId: "iqchat-95635",
  storageBucket: "iqchat-95635.firebasestorage.app",
  messagingSenderId: "803884265851",
  appId: "1:803884265851:web:c6a17427d17e6adb3e8dde"
};

let currentFirebaseConfig = null;
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isConfigured = false;

// 1. Try reading saved config from localStorage first
try {
  const saved = localStorage.getItem(FB_CONFIG_STORAGE_KEY);
  if (saved) {
    currentFirebaseConfig = JSON.parse(saved);
  }
} catch (e) {
  console.warn('Could not read saved Firebase config:', e);
}

// 2. Fallback to hardcoded DEFAULT_FIREBASE_CONFIG if localStorage is empty
if (!currentFirebaseConfig || !currentFirebaseConfig.apiKey) {
  if (DEFAULT_FIREBASE_CONFIG && DEFAULT_FIREBASE_CONFIG.apiKey && DEFAULT_FIREBASE_CONFIG.projectId) {
    currentFirebaseConfig = DEFAULT_FIREBASE_CONFIG;
  }
}

/**
 * Initialize Firebase Services
 */
export function initFirebaseService() {
  if (currentFirebaseConfig && currentFirebaseConfig.apiKey && currentFirebaseConfig.projectId) {
    try {
      if (!getApps().length) {
        firebaseApp = initializeApp(currentFirebaseConfig);
      } else {
        firebaseApp = getApp();
      }
      firebaseAuth = getAuth(firebaseApp);
      firebaseDb = getFirestore(firebaseApp);
      isConfigured = true;

      console.log('🔥 IQChat connected to Firebase Project:', currentFirebaseConfig.projectId);
      return { 
        isConfigured: true, 
        app: firebaseApp, 
        auth: firebaseAuth, 
        db: firebaseDb,
        config: currentFirebaseConfig
      };
    } catch (err) {
      console.error('Firebase initialization error:', err);
      isConfigured = false;
    }
  }

  return { isConfigured: false, config: currentFirebaseConfig };
}

export function getSavedFirebaseConfig() {
  return currentFirebaseConfig || DEFAULT_FIREBASE_CONFIG;
}

export function isFirebaseReady() {
  return isConfigured && firebaseAuth && firebaseDb;
}

export function saveFirebaseConfig(config) {
  try {
    localStorage.setItem(FB_CONFIG_STORAGE_KEY, JSON.stringify(config));
    location.reload();
  } catch (e) {
    console.error('Error saving Firebase config:', e);
  }
}

export function clearFirebaseConfig() {
  localStorage.removeItem(FB_CONFIG_STORAGE_KEY);
  location.reload();
}

export const firebaseServices = initFirebaseService();
