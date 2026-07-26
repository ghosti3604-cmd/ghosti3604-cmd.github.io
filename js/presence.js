/**
 * IQChat - Presence & Glowing Green Dot Indicator Module
 */

import { firebaseServices, isFirebaseReady } from './firebase-config.js';
import { collection, onSnapshot, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let presenceHeartbeatInterval = null;

/**
 * Start presence tracking heartbeat for logged-in user
 */
export function startPresenceSystem(userId) {
  if (!userId || !isFirebaseReady()) return;

  updateUserPresenceStatus(userId, true);

  if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
  presenceHeartbeatInterval = setInterval(() => {
    updateUserPresenceStatus(userId, true);
  }, 90000);

  window.addEventListener('beforeunload', () => {
    updateUserPresenceStatus(userId, false);
  });
}

export function stopPresenceSystem(userId) {
  if (presenceHeartbeatInterval) clearInterval(presenceHeartbeatInterval);
  if (userId && isFirebaseReady()) {
    updateUserPresenceStatus(userId, false);
  }
}

/**
 * Update user's online state in Firestore
 */
export async function updateUserPresenceStatus(userId, isOnline) {
  if (!isFirebaseReady()) return;
  try {
    const userRef = doc(firebaseServices.db, 'users', userId);
    await updateDoc(userRef, {
      isOnline: isOnline,
      lastSeen: Date.now()
    });
  } catch (e) {
    console.warn('Firebase presence update error:', e);
  }
}

/**
 * Subscribe to Real-Time Users list & Green Dot Presence Updates from Firestore
 */
export function subscribeToUsersPresence(currentUserId, onUpdateCallback) {
  if (!isFirebaseReady()) {
    onUpdateCallback([]);
    return () => {};
  }

  try {
    const usersCol = collection(firebaseServices.db, 'users');
    return onSnapshot(usersCol, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.id !== currentUserId) {
          usersList.push(data);
        }
      });
      onUpdateCallback(usersList);
    }, (error) => {
      console.error('Error listening to users presence:', error);
    });
  } catch (err) {
    console.error('Firestore subscription error:', err);
    return () => {};
  }
}

/**
 * Format status text into Arabic
 */
export function formatUserPresenceText(user) {
  if (!user) return 'غائب';
  if (user.isOnline) {
    return 'متصل الآن';
  }
  if (!user.lastSeen) return 'غير متصل';

  const diffMs = Date.now() - user.lastSeen;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'آخر ظهور منذ لحظات';
  if (diffMins < 60) return `آخر ظهور منذ ${diffMins} دقيقة`;
  if (diffHours < 24) return `آخر ظهور منذ ${diffHours} ساعة`;
  return 'غير متصل';
}
