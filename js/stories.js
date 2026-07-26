/**
 * IQChat - Daily Stories Module (24-hour expiring stories with Firebase)
 */

import { firebaseServices, isFirebaseReady } from './firebase-config.js';
import { 
  collection, addDoc, deleteDoc, doc, query, where, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORIES_COL = 'stories';
const DURATION = 24 * 60 * 60 * 1000;

export function subscribeToStories(callback) {
  if (!isFirebaseReady()) { callback([]); return () => {}; }

  const cutoff = Date.now() - DURATION;
  const ref = collection(firebaseServices.db, STORIES_COL);
  const q = query(ref, where('createdAt', '>', cutoff), orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snap) => {
    const stories = [];
    snap.forEach(d => {
      const data = d.data();
      if (data.createdAt > Date.now() - DURATION) {
        stories.push({ id: d.id, ...data });
      }
    });
    callback(stories);
  }, (err) => {
    console.warn('Stories error:', err);
    callback([]);
  });
}

export async function createStory(userId, userName, userAvatar, imageData, text) {
  if (!isFirebaseReady()) return { success: false, error: 'Firebase غير متصل' };
  try {
    await addDoc(collection(firebaseServices.db, STORIES_COL), {
      userId, userName, userAvatar, imageData,
      text: text || '',
      createdAt: Date.now()
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deleteStory(storyId) {
  if (!isFirebaseReady()) return { success: false, error: 'Firebase غير متصل' };
  try {
    await deleteDoc(doc(firebaseServices.db, STORIES_COL, storyId));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export function getTimeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  if (m < 1) return 'الآن';
  if (m < 60) return 'منذ ' + m + ' دقيقة';
  if (h < 24) return 'منذ ' + h + ' ساعة';
  return 'منتهية';
}
