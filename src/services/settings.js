import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs 
} from "firebase/firestore";
import { db } from "../firebase/config";

// Default settings
const DEFAULT_SETTINGS = {
  chestDuration: 7,
  notificationsEnabled: true,
  soundEnabled: true,
  theme: 'light'
};

// Get user settings
export const getUserSettings = async (userId) => {
  try {
    const settingsDoc = await getDoc(doc(db, "settings", userId));
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return {
        id: settingsDoc.id,
        ...DEFAULT_SETTINGS,
        ...data // User settings override defaults
      };
    }

    // Create default settings if they don't exist
    await setDoc(doc(db, "settings", userId), DEFAULT_SETTINGS);
    return { id: userId, ...DEFAULT_SETTINGS };

  } catch (error) {
    console.error("Error getting user settings:", error);
    throw error;
  }
};

// Update user settings
export const updateUserSettings = async (userId, newSettings) => {
  try {
    // Validate chest duration
    if (newSettings.chestDuration !== undefined) {
      const duration = parseInt(newSettings.chestDuration);
      if (isNaN(duration) || duration < 1 || duration > 30) {
        throw new Error("Chest duration must be between 1 and 30 days");
      }
    }

    await updateDoc(doc(db, "settings", userId), {
      ...newSettings,
      updatedAt: new Date().toISOString()
    });

    return { success: true };

  } catch (error) {
    console.error("Error updating user settings:", error);
    throw error;
  }
};

// Check if settings can be edited (no active chest)
export const canEditSettings = async (userId, partnerUserId) => {
  try {
    // If no partner, settings are always editable
    if (!partnerUserId) {
      return {
        canEdit: true,
        reason: null
      };
    }

    const chestsRef = collection(db, "chests");
    
    // Query for active or unlockable chests
    const q = query(
      chestsRef,
      where("status", "in", ["active", "unlockable"]),
      where("userId1", "in", [userId, partnerUserId]),
      where("userId2", "in", [userId, partnerUserId])
    );

    const querySnapshot = await getDocs(q);
    
    return {
      canEdit: querySnapshot.empty,
      reason: querySnapshot.empty ? null : "There is an active chest. Settings can only be changed when no chest is active."
    };

  } catch (error) {
    console.error("Error checking if settings can be edited:", error);
    // Return true on error to not block user from accessing settings
    return {
      canEdit: true,
      reason: "Error checking chest status. Proceed with caution."
    };
  }
};