/**
 * IQChat - Direct Realtime Messaging & Image Sharing Module (Firestore)
 */

import { firebaseServices, isFirebaseReady } from './firebase-config.js';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let currentActivePeer = null;

export function setActiveChatPeer(peerUser) {
  currentActivePeer = peerUser;
}

export function getActiveChatPeer() {
  return currentActivePeer;
}

export function getChatRoomId(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

/**
 * Subscribe to Firestore Real-time messages with specified target user
 */
export function subscribeToMessages(currentUserId, targetUserId, callback) {
  if (!isFirebaseReady()) {
    callback([]);
    return () => {};
  }

  const roomId = getChatRoomId(currentUserId, targetUserId);
  try {
    const msgsCol = collection(firebaseServices.db, 'chats', roomId, 'messages');
    const q = query(msgsCol, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() });
      });
      callback(msgs);
    }, (err) => {
      console.warn('Firestore messages snapshot error:', err);
    });
  } catch (err) {
    console.error('Error creating messages query:', err);
    return () => {};
  }
}

/**
 * Send Text Message to Firestore
 */
export async function sendTextMessage(currentUserId, targetUserId, text) {
  if (!text || !text.trim() || !isFirebaseReady()) return;

  const roomId = getChatRoomId(currentUserId, targetUserId);
  const msgData = {
    senderId: currentUserId,
    receiverId: targetUserId,
    text: text.trim(),
    type: 'text',
    timestamp: Date.now()
  };

  try {
    const msgsCol = collection(firebaseServices.db, 'chats', roomId, 'messages');
    await addDoc(msgsCol, msgData);
  } catch (e) {
    console.error('Error sending text message to Firestore:', e);
  }
}

/**
 * Send Image Attachment Message to Firestore
 */
export async function sendImageMessage(currentUserId, targetUserId, imageBase64OrUrl) {
  if (!imageBase64OrUrl || !isFirebaseReady()) return;

  const roomId = getChatRoomId(currentUserId, targetUserId);
  const msgData = {
    senderId: currentUserId,
    receiverId: targetUserId,
    text: '',
    imageUrl: imageBase64OrUrl,
    type: 'image',
    timestamp: Date.now()
  };

  try {
    const msgsCol = collection(firebaseServices.db, 'chats', roomId, 'messages');
    await addDoc(msgsCol, msgData);
  } catch (e) {
    console.error('Error sending image message to Firestore:', e);
  }
}

/**
 * Process and compress local image file to Data URL
 */
export function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject('لم يتم اختيار ملف');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 850;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = () => reject('فشل قراءة الصورة');
      img.src = e.target.result;
    };
    reader.onerror = () => reject('خطأ أثناء اختيار الصورة');
    reader.readAsDataURL(file);
  });
}

/**
 * Format timestamp into Arabic time
 */
export function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}
