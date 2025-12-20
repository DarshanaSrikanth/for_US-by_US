import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  getDocs,
  orderBy,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "../firebase/config";

// Default settings
const DEFAULT_SETTINGS = {
  chestDuration: 7 // days
};

// Create a new chest
export const createChest = async (userId1, userId2, durationDays = 7) => {
  try {
    // Check if either user already has an active chest
    const existingChest = await getActiveChest(userId1, userId2);
    if (existingChest) {
      throw new Error("An active chest already exists between you and your partner");
    }

    const timestamp = serverTimestamp();
    const unlockDate = new Date();
    unlockDate.setMinutes(unlockDate.getMinutes() + (durationDays));

    
    const chestId = `${userId1}_${userId2}_${Date.now()}`;
    
    // Create chest document
    await setDoc(doc(db, "chests", chestId), {
      userId1,
      userId2,
      startDate: timestamp,
      unlockDate: Timestamp.fromDate(unlockDate),
      status: 'active', // 'active' | 'unlockable' | 'completed' | 'opened'
      settings: {
        durationDays: durationDays
      },
      createdAt: timestamp,
      updatedAt: timestamp
    });

    // Create empty chits subcollection references
    await setDoc(doc(db, "chests", chestId, "metadata", "counters"), {
      chitCount: 0,
      readCountUser1: 0,
      readCountUser2: 0
    });

    return {
      success: true,
      chestId,
      startDate: new Date().toISOString(),
      unlockDate: unlockDate.toISOString()
    };

  } catch (error) {
    console.error("Error creating chest:", error);
    throw error;
  }
};

// Get active chest for a user pair
export const getActiveChest = async (userId1, userId2) => {
  try {
    const chestsRef = collection(db, "chests");
    
    // Query for chests where both users are involved AND status is active or unlockable
    const q = query(
      chestsRef,
      where("status", "in", ["active", "unlockable"]),
      where("userId1", "in", [userId1, userId2]),
      where("userId2", "in", [userId1, userId2])
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }

    // Should only have one active chest
    const chestDoc = querySnapshot.docs[0];
    const data = chestDoc.data();
    
    return {
      id: chestDoc.id,
      ...data,
      // Convert Firestore Timestamps to Date objects
      startDate: data.startDate?.toDate() || null,
      unlockDate: data.unlockDate?.toDate() || null,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null
    };

  } catch (error) {
    console.error("Error getting active chest:", error);
    throw error;
  }
};

// Get chest by ID
export const getChestById = async (chestId) => {
  try {
    const chestDoc = await getDoc(doc(db, "chests", chestId));
    
    if (!chestDoc.exists()) {
      return null;
    }

    const data = chestDoc.data();
    
    return {
      id: chestDoc.id,
      ...data,
      startDate: data.startDate?.toDate() || null,
      unlockDate: data.unlockDate?.toDate() || null,
      createdAt: data.createdAt?.toDate() || null,
      updatedAt: data.updatedAt?.toDate() || null
    };

  } catch (error) {
    console.error("Error getting chest:", error);
    throw error;
  }
};

// Update chest status
export const updateChestStatus = async (chestId, status) => {
  try {
    await updateDoc(doc(db, "chests", chestId), {
      status,
      updatedAt: serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error("Error updating chest status:", error);
    throw error;
  }
};

// Mark chest as completed (both users have read)
export const markChestCompleted = async (chestId) => {
  try {
    await updateDoc(doc(db, "chests", chestId), {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true };

  } catch (error) {
    console.error("Error marking chest completed:", error);
    throw error;
  }
};

// Check if chest is unlockable
export const checkChestUnlockable = async (chestId) => {
  try {
    const chest = await getChestById(chestId);
    
    if (!chest) {
      throw new Error("Chest not found");
    }

    const now = new Date();
    const unlockDate = chest.unlockDate;
    
    // Check if unlock date has passed
    const isUnlockable = unlockDate && now >= unlockDate;
    
    // If unlockable and still marked as active, update status
    if (isUnlockable && chest.status === 'active') {
      await updateChestStatus(chestId, 'unlockable');
      chest.status = 'unlockable';
    }

    return {
      isUnlockable,
      unlockDate: unlockDate?.toISOString(),
      daysRemaining: unlockDate 
        ? Math.max(0, Math.ceil((unlockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
        : 0
    };

  } catch (error) {
    console.error("Error checking chest unlockable:", error);
    throw error;
  }
};

// Get chest history for user
export const getChestHistory = async (userId) => {
  try {
    const chestsRef = collection(db, "chests");
    
    // Query for all chests involving this user
    const q = query(
      chestsRef,
      where("userId1", "in", [userId]),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    const chests = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      chests.push({
        id: docSnapshot.id,
        ...data,
        startDate: data.startDate?.toDate() || null,
        unlockDate: data.unlockDate?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || null
      });
    });

    // Also query for chests where user is userId2
    const q2 = query(
      chestsRef,
      where("userId2", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot2 = await getDocs(q2);
    querySnapshot2.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      chests.push({
        id: docSnapshot.id,
        ...data,
        startDate: data.startDate?.toDate() || null,
        unlockDate: data.unlockDate?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
        createdAt: data.createdAt?.toDate() || null
      });
    });

    // Sort by creation date
    chests.sort((a, b) => b.createdAt - a.createdAt);

    return chests;

  } catch (error) {
    console.error("Error getting chest history:", error);
    throw error;
  }
};

// Delete chest (admin/cleanup function - not for regular users)
export const deleteChest = async (chestId) => {
  try {
    await deleteDoc(doc(db, "chests", chestId));
    return { success: true };
  } catch (error) {
    console.error("Error deleting chest:", error);
    throw error;
  }
};

// Get chest statistics
export const getChestStats = async (chestId) => {
  try {
    const [chest, chitsSnapshot] = await Promise.all([
      getChestById(chestId),
      getDocs(collection(db, "chests", chestId, "chits"))
    ]);

    if (!chest) {
      throw new Error("Chest not found");
    }

    const chits = chitsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Count emotions
    const emotionCount = chits.reduce((acc, chit) => {
      acc[chit.emotion] = (acc[chit.emotion] || 0) + 1;
      return acc;
    }, {});

    return {
      totalChits: chits.length,
      emotionCount,
      startDate: chest.startDate,
      unlockDate: chest.unlockDate,
      status: chest.status
    };

  } catch (error) {
    console.error("Error getting chest stats:", error);
    throw error;
  }
};

// Check if user can start new chest
export const canStartNewChest = async (userId1, userId2) => {
  try {
    const chestsRef = collection(db, "chests");
    
    // Check for any active/unlockable chest
    const q = query(
      chestsRef,
      where("status", "in", ["active", "unlockable"]),
      where("userId1", "in", [userId1, userId2]),
      where("userId2", "in", [userId1, userId2])
    );

    const querySnapshot = await getDocs(q);
    
    // No active chest found
    if (querySnapshot.empty) {
      return { canStart: true };
    }

    // Check if the existing chest is completed
    const chestDoc = querySnapshot.docs[0];
    const chestData = chestDoc.data();
    
    if (chestData.status === 'completed') {
      return { canStart: true };
    }

    return { 
      canStart: false,
      existingChestId: chestDoc.id,
      status: chestData.status
    };

  } catch (error) {
    console.error("Error checking if can start new chest:", error);
    throw error;
  }
};