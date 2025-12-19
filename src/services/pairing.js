import { doc, getDoc, setDoc, updateDoc, getDocs, query, collection, where, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

// Main pairing function
export const initiatePairing = async (currentUserId, partnerUsername) => {
  try {
    // Step 1: Validate current user is unpaired
    const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
    const currentUserData = currentUserDoc.data();
    
    if (currentUserData.pairedUserId) {
      throw new Error("You are already paired with someone");
    }

    // Step 2: Check if partner username exists
    const usernameDoc = await getDoc(doc(db, "usernames", partnerUsername));
    if (!usernameDoc.exists()) {
      throw new Error("Username not found");
    }

    const partnerUserId = usernameDoc.data().userId;
    
    // Prevent self-pairing
    if (partnerUserId === currentUserId) {
      throw new Error("You cannot pair with yourself");
    }

    // Step 3: Get partner's data
    const partnerDoc = await getDoc(doc(db, "users", partnerUserId));
    const partnerData = partnerDoc.data();

    // Step 4: Validate partner is unpaired
    if (partnerData.pairedUserId) {
      throw new Error("This user is already paired with someone");
    }

    // Step 5: Validate opposite gender
    if (currentUserData.gender === partnerData.gender) {
      throw new Error("You can only pair with someone of opposite gender");
    }

    // Step 6: Check for historical pairing repetition
    const hasHistoricalPairing = await checkHistoricalPairing(currentUserId, partnerUserId);
    if (hasHistoricalPairing) {
      throw new Error("You have been paired with this person before. New pairing not allowed.");
    }

    // Step 7: Create pairing (atomic operation using batch or transaction)
    const batch = await pairUsers(currentUserId, partnerUserId);
    
    return {
      success: true,
      partnerUsername: partnerData.username,
      partnerGender: partnerData.gender,
      pairingTimestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error("Pairing error:", error);
    throw error;
  }
};

// Check if users were paired before
const checkHistoricalPairing = async (userId1, userId2) => {
  try {
    // In future, we'll store pairing history
    // For now, return false (no historical data)
    return false;
  } catch (error) {
    console.error("Error checking historical pairing:", error);
    throw error;
  }
};

// Atomic pairing operation
const pairUsers = async (userId1, userId2) => {
  try {
    const timestamp = serverTimestamp();
    
    // Update both users' documents
    await updateDoc(doc(db, "users", userId1), {
      pairedUserId: userId2,
      pairingTimestamp: timestamp
    });

    await updateDoc(doc(db, "users", userId2), {
      pairedUserId: userId1,
      pairingTimestamp: timestamp
    });

    // Create pairing record for history
    await setDoc(doc(db, "pairings", `${userId1}_${userId2}`), {
      userId1,
      userId2,
      pairedAt: timestamp,
      active: true
    });

    return { success: true };
  } catch (error) {
    console.error("Error in pairUsers:", error);
    throw new Error("Pairing failed. Please try again.");
  }
};

// Get partner's info
export const getPartnerInfo = async (partnerUserId) => {
  try {
    const partnerDoc = await getDoc(doc(db, "users", partnerUserId));
    if (partnerDoc.exists()) {
      const data = partnerDoc.data();
      return {
        username: data.username,
        gender: data.gender,
        pairedSince: data.pairingTimestamp?.toDate?.() || data.pairingTimestamp
      };
    }
    return null;
  } catch (error) {
    console.error("Error getting partner info:", error);
    throw error;
  }
};

// Check if user is paired
export const checkPairingStatus = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('checkPairingStatus - Firestore data:', data);
      return {
        isPaired: !!data.pairedUserId,
        partnerUserId: data.pairedUserId
      };
    }
    return { isPaired: false, partnerUserId: null };
  } catch (error) {
    console.error("Error checking pairing status:", error);
    throw error;
  }
};

// Get all unpaired users (for future admin view)
export const getUnpairedUsers = async (currentUserId) => {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("pairedUserId", "==", null));
    const querySnapshot = await getDocs(q);
    
    const unpairedUsers = [];
    querySnapshot.forEach((doc) => {
      if (doc.id !== currentUserId) {
        unpairedUsers.push({
          id: doc.id,
          ...doc.data()
        });
      }
    });
    
    return unpairedUsers;
  } catch (error) {
    console.error("Error getting unpaired users:", error);
    throw error;
  }
};