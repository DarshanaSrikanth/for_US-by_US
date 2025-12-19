import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

// Transform username to email format
const formatEmail = (username) => {
  return `${username}@chest.app`;
};

// Check if username already exists
export const checkUsernameExists = async (username) => {
  try {
    const userDoc = await getDoc(doc(db, "usernames", username));
    return userDoc.exists();
  } catch (error) {
    console.error("Error checking username:", error);
    return false;
  }
};

// Sign up new user
export const signUpUser = async (username, password, gender) => {
  try {
    // Check if username is available
    const exists = await checkUsernameExists(username);
    if (exists) {
      throw new Error("Username already taken");
    }

    // Create auth user with formatted email
    const email = formatEmail(username);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      username: username,
      gender: gender,
      pairedUserId: null,
      pairingTimestamp: null,
      createdAt: new Date().toISOString()
    });

    // Reserve username
    await setDoc(doc(db, "usernames", username), {
      userId: user.uid,
      createdAt: new Date().toISOString()
    });

    return { success: true, userId: user.uid };
  } catch (error) {
    console.error("Sign up error:", error);
    throw error;
  }
};

// Sign in existing user
export const signInUser = async (username, password) => {
  try {
    const email = formatEmail(username);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, userId: userCredential.user.uid };
  } catch (error) {
    console.error("Sign in error:", error);
    throw error;
  }
};

// Sign out user
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    throw error;
  }
};

// Get current user's profile data
export const getUserProfile = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (userDoc.exists()) {
      return { ...userDoc.data(), id: userDoc.id };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Auth state listener
export const onAuthChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile = await getUserProfile(user.uid);
      callback({ user, profile });
    } else {
      callback(null);
    }
  });
};


// Check if user needs to complete onboarding
export const getUserOnboardingStatus = async (userId) => {
  try {
    const profile = await getUserProfile(userId);
    if (!profile) return { needsOnboarding: true };
    
    return {
      needsOnboarding: !profile.gender,
      needsPairing: !profile.pairedUserId,
      profile
    };
  } catch (error) {
    console.error("Error getting onboarding status:", error);
    throw error;
  }
};