import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  increment
} from "firebase/firestore";
import { db } from "../firebase/config";

// Valid emotions for chits
export const VALID_EMOTIONS = [
  'angry',
  'sad', 
  'disappointed',
  'grateful',
  'happy'
];

// Add a new chit to a chest
export const addChit = async (chestId, authorId, content, emotion) => {
  try {
    // Validate emotion
    if (!VALID_EMOTIONS.includes(emotion)) {
      throw new Error('Invalid emotion selected');
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('Chit content cannot be empty');
    }

    if (content.length > 1000) {
      throw new Error('Chit content is too long (max 1000 characters)');
    }

    // Check if chest exists and is active
    const chestDoc = await getDoc(doc(db, "chests", chestId));
    if (!chestDoc.exists()) {
      throw new Error('Chest not found');
    }

    const chestData = chestDoc.data();
    if (chestData.status !== 'active') {
      throw new Error('Cannot add chit to a chest that is not active');
    }

    // Check if author is part of this chest
    if (chestData.userId1 !== authorId && chestData.userId2 !== authorId) {
      throw new Error('You are not authorized to add chits to this chest');
    }

    // Check if chest is still locked (should be, but double-check)
    const now = new Date();
    const unlockDate = chestData.unlockDate?.toDate();
    if (unlockDate && now >= unlockDate) {
      throw new Error('Chest has already unlocked. Cannot add new chits.');
    }

    const chitId = `${chestId}_${authorId}_${Date.now()}`;
    const timestamp = serverTimestamp();

    // Use batch to update both chit and counter atomically
    const batch = writeBatch(db);

    // Create chit document
    batch.set(doc(db, "chests", chestId, "chits", chitId), {
      chestId,
      authorId,
      content: content.trim(),
      emotion,
      createdAt: timestamp,
      updatedAt: timestamp,
      isRead: false,
      readAt: null
    });

    // Update chit counter in metadata
    const counterRef = doc(db, "chests", chestId, "metadata", "counters");
    batch.set(counterRef, {
      chitCount: increment(1),
      [`chitCount_${authorId}`]: increment(1)
    }, { merge: true });

    await batch.commit();

    return {
      success: true,
      chitId,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error adding chit:', error);
    throw error;
  }
};

// Get all chits for a chest (for reading)
export const getChitsForChest = async (chestId, readerId) => {
  try {
    // First, verify the chest and reader authorization
    const chestDoc = await getDoc(doc(db, "chests", chestId));
    if (!chestDoc.exists()) {
      throw new Error('Chest not found');
    }

    const chestData = chestDoc.data();
    
    // Check if reader is part of this chest
    if (chestData.userId1 !== readerId && chestData.userId2 !== readerId) {
      throw new Error('You are not authorized to read chits from this chest');
    }

    // Determine partner's ID
    const partnerId = chestData.userId1 === readerId ? chestData.userId2 : chestData.userId1;

    // Query partner's chits only
    const chitsRef = collection(db, "chests", chestId, "chits");
    const q = query(
      chitsRef,
      where("authorId", "==", partnerId),
      orderBy("createdAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    const chits = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      chits.push({
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
        readAt: data.readAt?.toDate() || null
      });
    });

    return chits;

  } catch (error) {
    console.error('Error getting chits:', error);
    throw error;
  }
};


export const markChitAsRead = async (chestId, chitId, readerId) => {
  try {
    const timestamp = serverTimestamp();
    const chitRef = doc(db, "chests", chestId, "chits", chitId);
    
    await updateDoc(chitRef, {
      isRead: true,
      readAt: timestamp,
      readBy: readerId
    });

    // Update read counter
    const counterRef = doc(db, "chests", chestId, "metadata", "counters");
    await updateDoc(counterRef, {
      readCount: increment(1),
      [`readBy_${readerId}`]: increment(1)
    });

    return { success: true };

  } catch (error) {
    console.error('Error marking chit as read:', error);
    throw error;
  }
};

// Get chit statistics for a chest
export const getChitStats = async (chestId, userId) => {
  try {
    const chestDoc = await getDoc(doc(db, "chests", chestId));
    if (!chestDoc.exists()) {
      throw new Error('Chest not found');
    }

    const chestData = chestDoc.data();
    const partnerId = chestData.userId1 === userId ? chestData.userId2 : chestData.userId1;

    // Get all chits from partner
    const chitsRef = collection(db, "chests", chestId, "chits");
    const q = query(chitsRef, where("authorId", "==", partnerId));
    const querySnapshot = await getDocs(q);

    const chits = [];
    let readCount = 0;
    const emotionCount = {};

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      chits.push({
        id: docSnapshot.id,
        ...data
      });

      if (data.isRead) readCount++;

      // Count emotions
      if (data.emotion) {
        emotionCount[data.emotion] = (emotionCount[data.emotion] || 0) + 1;
      }
    });

    return {
      totalChits: chits.length,
      readCount,
      remainingCount: chits.length - readCount,
      emotionCount,
      progress: chits.length > 0 ? Math.round((readCount / chits.length) * 100) : 0
    };

  } catch (error) {
    console.error('Error getting chit stats:', error);
    throw error;
  }
};

// Get user's own chits (for reference, not reading)
export const getMyChits = async (chestId, authorId) => {
  try {
    const chitsRef = collection(db, "chests", chestId, "chits");
    const q = query(
      chitsRef,
      where("authorId", "==", authorId),
      orderBy("createdAt", "asc")
    );

    const querySnapshot = await getDocs(q);
    const chits = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      chits.push({
        id: docSnapshot.id,
        ...data,
        createdAt: data.createdAt?.toDate() || null
      });
    });

    return chits;

  } catch (error) {
    console.error('Error getting my chits:', error);
    throw error;
  }
};

// Get all chests with chits for history
export const getChitsHistory = async (userId) => {
  try {
    // Get all chests involving this user
    const chestsRef = collection(db, "chests");
    const q1 = query(chestsRef, where("userId1", "==", userId));
    const q2 = query(chestsRef, where("userId2", "==", userId));

    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ]);

    const allChests = [];
    snapshot1.forEach(doc => allChests.push({ id: doc.id, ...doc.data() }));
    snapshot2.forEach(doc => allChests.push({ id: doc.id, ...doc.data() }));

    // For each chest, get partner's chits
    const history = [];

    for (const chest of allChests) {
      const partnerId = chest.userId1 === userId ? chest.userId2 : chest.userId1;
      
      const chitsRef = collection(db, "chests", chest.id, "chits");
      const q = query(
        chitsRef,
        where("authorId", "==", partnerId),
        orderBy("createdAt", "asc")
      );

      const chitsSnapshot = await getDocs(q);
      const chits = [];

      chitsSnapshot.forEach(doc => {
        const data = doc.data();
        chits.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || null,
          readAt: data.readAt?.toDate() || null
        });
      });

      if (chits.length > 0) {
        history.push({
          chestId: chest.id,
          startDate: chest.startDate?.toDate() || null,
          unlockDate: chest.unlockDate?.toDate() || null,
          status: chest.status,
          chits,
          partnerId
        });
      }
    }

    // Sort by unlock date (newest first)
    history.sort((a, b) => b.unlockDate - a.unlockDate);

    return history;

  } catch (error) {
    console.error('Error getting chits history:', error);
    throw error;
  }
};

export const isValidEmotion = (emotion) => {
  const normalized = emotion?.toLowerCase().trim();
  return VALID_EMOTIONS.includes(normalized);
};