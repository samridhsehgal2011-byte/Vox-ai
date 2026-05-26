import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  setDoc, 
  doc,
  getDocs,
  Timestamp,
  updateDoc
} from "firebase/firestore";
import { db } from "./firebase";

export interface Chat {
  id: string;
  userId: string;
  userEmail: string;
  title: string;
  createdAt: any;
  updatedAt: any;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  createdAt: any;
  mediaUrl?: string;
  mediaType?: "image" | "video";
}

export const createChat = async (userId: string, userEmail: string, title: string) => {
  return await addDoc(collection(db, "chats"), {
    userId,
    userEmail,
    title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateChatTitle = async (chatId: string, title: string) => {
  await updateDoc(doc(db, "chats", chatId), {
    title,
    updatedAt: serverTimestamp()
  });
};

export const addMessage = async (chatId: string, message: Omit<ChatMessage, "id" | "createdAt">) => {
  // Update chat's last activity
  try {
    await updateDoc(doc(db, "chats", chatId), {
      updatedAt: serverTimestamp()
    });
  } catch (e) {
    console.error("Failed to update chat activity, proceeding with message add:", e);
  }
  
  return await addDoc(collection(db, "chats", chatId, "messages"), {
    ...message,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToChats = (userEmail: string, callback: (chats: Chat[]) => void) => {
  const q = query(
    collection(db, "chats"),
    where("userEmail", "==", userEmail),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Chat[];
    callback(chats);
  });
};

export const subscribeToMessages = (chatId: string, callback: (messages: ChatMessage[]) => void) => {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    callback(messages);
  });
};

export const saveUserProfile = async (userId: string, profile: { email: string; displayName: string; photoURL: string }) => {
  await setDoc(doc(db, "users", userId), {
    ...profile,
    createdAt: serverTimestamp(),
  }, { merge: true });
};
