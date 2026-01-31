"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
    User,
    onAuthStateChanged,
    signInAnonymously,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as fbSignOut,
    signInWithPhoneNumber,
    RecaptchaVerifier,
    linkWithPopup
} from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: () => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    signInWithPhone: (phone: string, recaptchaId: string) => Promise<any>;
    signOut: () => Promise<void>;
    disconnectGoogle: () => void;
    googleToken: string | null;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [googleToken, setGoogleToken] = useState<string | null>(null);

    useEffect(() => {
        // Hydrate token from storage if available
        const storedToken = localStorage.getItem("google_access_token");
        if (storedToken) setGoogleToken(storedToken);
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signIn = async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Auth error", error);
        }
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();


        try {
            let result;
            if (auth.currentUser && !auth.currentUser.isAnonymous) {
                // If already logged in with Email/Phone, LINK instead of sign-in
                result = await linkWithPopup(auth.currentUser, provider);
            } else {
                result = await signInWithPopup(auth, provider);
            }

            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                setGoogleToken(token);
                localStorage.setItem("google_access_token", token);
            }
        } catch (error: any) {
            console.error("Google Auth error", error.code, error.message);
            if (error.code === 'auth/credential-already-in-use') {
                alert("Ce compte Google est déjà lié à un autre utilisateur. Déconnectez-vous et connectez-vous directement avec Google.");
            }
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Email Login error", error);
            throw error;
        }
    };

    const signUpWithEmail = async (email: string, pass: string) => {
        try {
            await createUserWithEmailAndPassword(auth, email, pass);
        } catch (error) {
            console.error("Email Signup error", error);
            throw error;
        }
    };

    const signInWithPhone = async (phone: string, recaptchaId: string) => {
        const verifier = new RecaptchaVerifier(auth, recaptchaId, {
            size: 'invisible'
        });
        try {
            return await signInWithPhoneNumber(auth, phone, verifier);
        } catch (error) {
            console.error("Phone Auth error", error);
            throw error;
        }
    };

    const disconnectGoogle = () => {
        setGoogleToken(null);
        localStorage.removeItem("google_access_token");
    };

    const signOut = async () => {
        try {
            await fbSignOut(auth);
            disconnectGoogle();
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signIn,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signInWithPhone,
            signOut,
            disconnectGoogle,
            googleToken
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
