"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useHousehold } from "@/hooks/useHousehold";
import { ArrowRight, Home, Users, Loader } from "lucide-react";
import { motion } from "framer-motion";

export default function HouseholdSetup() {
    const {
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithPhone,
        user
    } = useAuth();
    const { createHousehold, joinHousehold } = useHousehold();

    const [mode, setMode] = useState<"menu" | "create" | "join">("menu");
    const [authType, setAuthType] = useState<"options" | "email" | "phone" | "verify">("options");
    const [isSignUp, setIsSignUp] = useState(false);

    // Auth inputs
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [code, setCode] = useState("");
    const [confirmationResult, setConfirmationResult] = useState<any>(null);

    const [inputVal, setInputVal] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);
        try {
            await signInWithGoogle();
        } catch (err: any) {
            console.error("Google Auth Error:", err);
            if (err.code === "auth/unauthorized-domain") {
                setError("Ce domaine n'est pas autorisé dans la console Firebase. Ajoutez l'adresse IP actuelle aux domaines autorisés.");
            } else {
                setError(err.message || "Erreur Google");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (isSignUp) await signUpWithEmail(email, password);
            else await signInWithEmail(email, password);
        } catch (err: any) {
            setError(err.message || "Erreur Email");
        } finally {
            setLoading(false);
        }
    };

    const handlePhoneAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await signInWithPhone(phone, 'phone-auth-container');
            setConfirmationResult(res);
            setAuthType("verify");
        } catch (err: any) {
            setError(err.message || "Erreur Téléphone");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await confirmationResult.confirm(code);
        } catch (err: any) {
            setError(err.message || "Code invalide");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "create") await createHousehold(inputVal);
            if (mode === "join") await joinHousehold(inputVal);
        } catch (err) {
            console.error("HouseholdSetup Error:", err);
            setError("Une erreur est survenue");
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center p-6 min-h-[60vh] max-w-md mx-auto">
                <div className="w-full bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 transition-colors">
                    <div className="flex flex-col items-center text-center mb-8">
                        <img src="/logo.png" alt="LifeSync Logo" className="w-20 h-20 rounded-full shadow-2xl mb-4 border-4 border-white dark:border-slate-800" />
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Bienvenue sur LifeSync</h2>
                        <p className="text-slate-500 text-sm">Synchronisez votre foyer sur tous vos appareils.</p>
                    </div>

                    <div id="phone-auth-container"></div>

                    {authType === "options" && (
                        <div className="space-y-4">
                            {error && <p className="text-red-500 text-xs font-bold text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-xl mb-4">{error}</p>}
                            <button
                                onClick={handleGoogleLogin}
                                className="w-full p-4 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center gap-3 font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95"
                            >
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                                Continuer avec Google
                            </button>

                            <button
                                onClick={() => setAuthType("email")}
                                className="w-full p-4 bg-slate-800 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-slate-700 transition active:scale-95"
                            >
                                <ArrowRight size={20} />
                                Utiliser votre Email
                            </button>

                            <button
                                onClick={() => setAuthType("phone")}
                                className="w-full p-4 bg-emerald-600 text-white rounded-2xl flex items-center justify-center gap-3 font-bold hover:bg-emerald-700 transition active:scale-95"
                            >
                                <Users size={20} />
                                Avec votre Téléphone
                            </button>
                        </div>
                    )}

                    {authType === "email" && (
                        <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleEmailAuth} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-emerald-500"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-emerald-500"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                            </div>
                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                            <button disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">
                                {loading ? <Loader size={20} className="animate-spin mx-auto" /> : (isSignUp ? "Créer mon compte" : "Se connecter")}
                            </button>
                            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="w-full text-xs font-bold text-slate-400 hover:text-emerald-500">
                                {isSignUp ? "Déjà un compte ? Se connecter" : "Pas de compte ? S'inscrire"}
                            </button>
                            <button type="button" onClick={() => setAuthType("options")} className="w-full text-xs font-bold text-slate-300">Retour</button>
                        </motion.form>
                    )}

                    {authType === "phone" && (
                        <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handlePhoneAuth} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Numéro de téléphone</label>
                                <input
                                    type="tel"
                                    required
                                    placeholder="+33 6 12 34 56 78"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold outline-emerald-500"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                />
                            </div>
                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                            <button disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">
                                {loading ? <Loader size={20} className="animate-spin mx-auto" /> : "Envoyer le code"}
                            </button>
                            <button type="button" onClick={() => setAuthType("options")} className="w-full text-xs font-bold text-slate-300">Retour</button>
                        </motion.form>
                    )}

                    {authType === "verify" && (
                        <motion.form initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} onSubmit={handleVerifyCode} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code de vérification</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="123456"
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-bold text-center text-2xl tracking-[0.5em] outline-emerald-500"
                                    value={code}
                                    onChange={e => setCode(e.target.value)}
                                />
                            </div>
                            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                            <button disabled={loading} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg">
                                {loading ? <Loader size={20} className="animate-spin mx-auto" /> : "Vérifier"}
                            </button>
                            <button type="button" onClick={() => setAuthType("phone")} className="w-full text-xs font-bold text-slate-300">Modifier le numéro</button>
                        </motion.form>
                    )}
                </div>
            </div>
        );
    }



    return (
        <div className="flex flex-col items-center justify-center p-6 min-h-[60vh] max-w-md mx-auto">

            <div className="w-full bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 transition-colors">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 text-center">Foyer Familial</h1>
                <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">Synchronisez vos agendas et listes en rejoignant un foyer.</p>

                {mode === "menu" && (
                    <div className="space-y-3">
                        <button onClick={() => setMode("create")} className="w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900 rounded-xl flex items-center gap-4 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition group">
                            <div className="bg-emerald-200 dark:bg-emerald-800 p-2 rounded-lg text-emerald-800 dark:text-emerald-200"><Home size={24} /></div>
                            <div className="text-left">
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-300">Créer un foyer</h3>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">Pour votre famille</p>
                            </div>
                        </button>
                        <button onClick={() => setMode("join")} className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900 rounded-xl flex items-center gap-4 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition group">
                            <div className="bg-blue-200 dark:bg-blue-800 p-2 rounded-lg text-blue-800 dark:text-blue-200"><Users size={24} /></div>
                            <div className="text-left">
                                <h3 className="font-bold text-blue-900 dark:text-blue-300">Rejoindre</h3>
                                <p className="text-xs text-blue-600 dark:text-blue-400">Avec un code d'invitation</p>
                            </div>
                        </button>
                    </div>
                )}

                {mode !== "menu" && (
                    <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                {mode === "create" ? "Nom de la famille" : "Code d'invitation (6 lettres)"}
                            </label>
                            <input
                                autoFocus
                                value={inputVal}
                                onChange={e => setInputVal(e.target.value)}
                                className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-black dark:text-white rounded-xl font-bold text-lg outline-emerald-500 placeholder:text-slate-400"
                                placeholder={mode === "create" ? "Ex: Famille Dupont" : "Ex: XKY78A"}
                            />
                        </div>
                        {error && <p className="text-red-500 text-xs font-bold bg-red-50 dark:bg-red-900/30 p-2 rounded">{error}</p>}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setMode("menu")} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl">Retour</button>
                            <button disabled={loading || !inputVal} className="flex-[2] bg-slate-800 dark:bg-emerald-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-slate-700 dark:hover:bg-emerald-700 disabled:opacity-50">
                                {loading && <Loader className="animate-spin" size={16} />}
                                {mode === "create" ? "Créer" : "Rejoindre"}
                            </button>
                        </div>
                    </motion.form>
                )}
            </div>
        </div>
    );
}
