/**
 * IQChat - Authentication Module (Strict Firebase Auth & Instant Logout)
 */

import { firebaseServices, isFirebaseReady } from './firebase-config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentUser = null;

export function listenToAuthState(callback) {
  if (!isFirebaseReady()) {
    callback(null);
    return;
  }

  onAuthStateChanged(firebaseServices.auth, async (fbUser) => {
    if (fbUser) {
      let userData = {
        id: fbUser.uid,
        name: fbUser.displayName || 'مستخدم IQChat',
        email: fbUser.email,
        avatar: fbUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=IQUser1',
        isOnline: true
      };

      try {
        const userRef = doc(firebaseServices.db, 'users', fbUser.uid);
        const snap = await getDoc(userRef);

        if (snap && snap.exists()) {
          userData = { ...userData, ...snap.data(), isOnline: true };
        } else {
          await setDoc(userRef, userData, { merge: true });
        }

        updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
      } catch (err) {
        console.warn('Firestore user document sync warning:', err);
      }

      currentUser = userData;
      callback(currentUser);
    } else {
      currentUser = null;
      callback(null);
    }
  });
}

export function getCurrentUser() {
  return currentUser;
}

/**
 * Register Real Firebase Account
 */
export async function registerUser({ name, email, password, avatar }) {
  if (!isFirebaseReady()) {
    return { success: false, error: 'يرجى إدخال وتفعيل بيانات مشروع Firebase أولاً.' };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(firebaseServices.auth, email, password);
    const user = userCredential.user;

    const photoURL = avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(name);

    await updateProfile(user, {
      displayName: name,
      photoURL: photoURL
    });

    const userData = {
      id: user.uid,
      name: name,
      email: email,
      avatar: photoURL,
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    try {
      const userRef = doc(firebaseServices.db, 'users', user.uid);
      await setDoc(userRef, userData);
    } catch (fsErr) {
      console.warn('Firestore write warning during registration:', fsErr);
    }

    currentUser = userData;
    return { success: true, user: userData };
  } catch (error) {
    console.error('Firebase Auth Register Error:', error);
    return { success: false, error: translateAuthError(error.code || error.message) };
  }
}

/**
 * Login Real Firebase Account
 */
export async function loginUser({ email, password }) {
  if (!isFirebaseReady()) {
    return { success: false, error: 'يرجى إدخال وتفعيل بيانات مشروع Firebase أولاً.' };
  }

  try {
    const userCredential = await signInWithEmailAndPassword(firebaseServices.auth, email, password);
    const user = userCredential.user;

    let userData = {
      id: user.uid,
      name: user.displayName || 'مستخدم IQChat',
      email: user.email,
      avatar: user.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=IQUser1',
      isOnline: true,
      lastSeen: Date.now()
    };

    try {
      const userRef = doc(firebaseServices.db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (snap && snap.exists()) {
        userData = { ...userData, ...snap.data(), isOnline: true };
      }
      updateDoc(userRef, { isOnline: true, lastSeen: Date.now() }).catch(() => {});
    } catch (fsErr) {
      console.warn('Firestore doc read warning during login:', fsErr);
    }

    currentUser = userData;
    return { success: true, user: userData };
  } catch (error) {
    console.error('Firebase Auth Login Error:', error);
    return { success: false, error: translateAuthError(error.code || error.message) };
  }
}

/**
 * Instant Logout
 */
export async function logoutUser() {
  if (currentUser && isFirebaseReady()) {
    try {
      const userRef = doc(firebaseServices.db, 'users', currentUser.id);
      updateDoc(userRef, { isOnline: false, lastSeen: Date.now() }).catch(() => {});
    } catch (e) {
      console.warn('Presence update error on logout:', e);
    }
  }

  currentUser = null;

  if (isFirebaseReady()) {
    try {
      await signOut(firebaseServices.auth);
    } catch (e) {
      console.warn('SignOut error:', e);
    }
  }
}

function translateAuthError(code) {
  if (!code) return 'حدث خطأ في عملية التوثيق عبر Firebase.';

  switch (code) {
    case 'auth/configuration-not-found':
      return 'لم يتم تفعيل خدمة تسجيل الدخول بالبريد والسر في مشروعك بـ Firebase!\nالخطوات:\n1. ادخل إلى Firebase Console\n2. اختر Authentication > Sign-in method\n3. اضغط على Email/Password ثم قم بتفعيلها وتنفيذ Save.';
    case 'auth/email-already-in-use':
      return 'البريد الإلكتروني مسجل بالفعل لمستخدم آخر في Firebase. يمكنك تسجيل الدخول بدلاً من ذلك.';
    case 'auth/invalid-email':
      return 'صيغة البريد الإلكتروني غير صحيحة. يرجى إدخال بريد صحيح مثل name@example.com.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد الإلكتروني أو كلمة السر غير صحيحة.';
    case 'auth/weak-password':
      return 'كلمة السر ضعيفة. يجب أن تتكون من 6 أحرف على الأقل.';
    case 'auth/operation-not-allowed':
      return 'خدمة البريد وكلمة السر غير مفعّلة في وحدة تحكم Firebase (Authentication > Sign-in method).';
    case 'permission-denied':
      return 'تم إنشاء الحساب في Firebase Auth بنجاح!';
    default:
      return 'حدث خطأ في التوثيق (' + code + '). تأكد من تفعيل Authentication بالبريد وكلمة السر من لوحة تحكم Firebase.';
  }
}
