import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, isOwner, isDev, signUpWithEmail, signInWithEmail, sendVerificationEmail, signOut } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isDev: boolean;
  signUp: typeof signUpWithEmail;
  signIn: typeof signInWithEmail;
  sendVerification: typeof sendVerificationEmail;
  signOut: typeof signOut;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, isDev: false, signUp: async () => ({} as any), signIn: async () => ({} as any), sendVerification: async () => {}, signOut: async () => {} });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: isOwner(user?.email), isDev: isDev(user?.email), signUp: signUpWithEmail, signIn: signInWithEmail, sendVerification: sendVerificationEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
