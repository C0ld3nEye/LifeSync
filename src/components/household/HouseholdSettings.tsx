"use client";

import { useState, useEffect } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { X, Copy, Check, Settings, Trash2, Edit2, LogOut, Link2Off, Calendar, Send } from "lucide-react";
import { differenceInYears, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/components/providers/AuthProvider";
import { sendTelegramMessage } from "@/lib/telegram";

export default function HouseholdSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { household, updateHouseholdName, updateMemberProfile, updateMemberPreferences } = useHousehold();
    const { user, signOut } = useAuth();
    const [name, setName] = useState(household?.name || "");
    const [isEditing, setIsEditing] = useState(false);
    const [editingMemberUid, setEditingMemberUid] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [copied, setCopied] = useState(false);

    // Telegram State
    const [saving, setSaving] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const telegramChatId = household?.memberPreferences?.[user?.uid || '']?.telegramChatId;
    const [telegramChatInput, setTelegramChatInput] = useState("");

    useEffect(() => {
        if (isOpen && telegramChatId) {
            setTelegramChatInput(telegramChatId);
        }
    }, [isOpen, telegramChatId]);

    const saveTelegramId = async () => {
        if (!user || saving) return;
        setSaving(true);
        try {
            await updateMemberPreferences(user.uid, { telegramChatId: telegramChatInput });
            alert("ID Telegram enregistré !");
        } catch (error) {
            console.error("Save error:", error);
            alert("Erreur lors de l'enregistrement");
        } finally {
            setSaving(false);
        }
    };

    const testTelegram = async () => {
        if (!telegramChatId) return;
        setPushLoading(true);
        try {
            const success = await sendTelegramMessage(telegramChatId, "👋 Hello depuis LifeSync ! Tout fonctionne.");
            if (success) alert("Message envoyé ! Vérifiez votre appli Telegram.");
            else alert("Échec de l'envoi. Vérifiez l'ID et que vous avez bien lancé le bot.");
        } catch (e) {
            alert("Erreur technique.");
        } finally {
            setPushLoading(false);
        }
    };

    const handleCopy = () => {
        if (!household) return;
        navigator.clipboard.writeText(household.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveName = async () => {
        if (!name.trim()) return;
        await updateHouseholdName(name);
        setIsEditing(false);
    };

    const handleSaveMemberName = async (uid: string) => {
        if (!editName.trim()) return;
        await updateMemberProfile(uid, {
            displayName: editName
        });
        setEditingMemberUid(null);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] overflow-y-auto">
                <div className="flex min-h-full items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col my-8 relative z-10"
                    >
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <header className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Settings size={20} className="text-slate-400" /> Paramètres du Foyer
                                </h2>
                                <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition">
                                    <X size={20} className="text-slate-400" />
                                </button>
                            </header>

                            <div className="space-y-6">
                                {/* Household Name */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Nom du foyer</label>
                                    <div className="flex gap-2">
                                        {isEditing ? (
                                            <div className="flex-1 flex gap-2">
                                                <input
                                                    autoFocus
                                                    value={name}
                                                    onChange={e => setName(e.target.value)}
                                                    className="flex-1 bg-slate-50 dark:bg-slate-800 border-none rounded-xl px-4 py-2 font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                                                />
                                                <button onClick={handleSaveName} className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-sm">OK</button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-xl">
                                                <span className="font-bold text-slate-700 dark:text-slate-200">{household?.name}</span>
                                                <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-emerald-500 transition">
                                                    <Edit2 size={16} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Join Code */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Code d'invitation</label>
                                    <button
                                        onClick={handleCopy}
                                        className="w-full flex justify-between items-center bg-slate-900 text-white px-5 py-4 rounded-2xl group transition active:scale-95"
                                    >
                                        <div className="text-left">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Partager ce code</p>
                                            <span className="text-2xl font-mono tracking-widest font-black leading-none">{household?.id}</span>
                                        </div>
                                        <div className={cn(
                                            "p-3 rounded-xl transition-all",
                                            copied ? "bg-emerald-500 text-white" : "bg-white/10 text-slate-400 group-hover:bg-white/20 group-hover:text-white"
                                        )}>
                                            {copied ? <Check size={20} /> : <Copy size={20} />}
                                        </div>
                                    </button>
                                    <p className="mt-2 text-[10px] text-slate-400 text-center font-medium">Les membres peuvent rejoindre avec ce code unique.</p>
                                </div>

                                {/* Member List */}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Membres ({household?.members.length})</label>
                                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {household?.memberProfiles?.map((m) => {
                                            const isCurrentUser = user?.uid === m.uid;
                                            const earnedBadges = household.badges?.[m.uid] || [];
                                            const activeBadge = m.activeBadge;

                                            return (
                                                <div key={m.uid} className="flex flex-col gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
                                                    <div className="flex items-center gap-3">
                                                        {m.photoURL ? (
                                                            <img src={m.photoURL} alt={m.displayName} className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-800" />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 text-sm border-2 border-white dark:border-slate-800">
                                                                {m.displayName[0]}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            {editingMemberUid === m.uid ? (
                                                                <div className="flex flex-col gap-2 w-full">
                                                                    <input
                                                                        autoFocus
                                                                        value={editName}
                                                                        onChange={e => setEditName(e.target.value)}
                                                                        className="w-full bg-white dark:bg-slate-900 border-none rounded-lg px-2 py-2 text-sm font-bold outline-none ring-1 ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400"
                                                                        placeholder="Prénom"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() => handleSaveMemberName(m.uid)}
                                                                            className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm shadow-emerald-500/20 active:scale-95 transition-all"
                                                                        >
                                                                            OK
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{m.displayName}</p>
                                                                    {m.birthDate && <span className="text-xs text-slate-400 font-medium">({differenceInYears(new Date(), parseISO(m.birthDate))} ans)</span>}
                                                                    {activeBadge && (
                                                                        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-black border border-amber-200 dark:border-amber-800/50">
                                                                            {activeBadge}
                                                                        </span>
                                                                    )}
                                                                    {isCurrentUser && (
                                                                        <button onClick={() => {
                                                                            setEditingMemberUid(m.uid);
                                                                            setEditName(m.displayName);
                                                                        }} className="text-slate-300 hover:text-emerald-500 transition">
                                                                            <Edit2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <p className="text-[10px] text-slate-400 font-medium">{isCurrentUser ? "Vous" : "Membre"}</p>
                                                        </div>
                                                    </div>

                                                    {/* Badge Selector for Current User */}
                                                    {isCurrentUser && earnedBadges.length > 0 && (
                                                        <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Choisir un badge actif</p>
                                                            <div className="flex flex-wrap gap-2">
                                                                <button
                                                                    onClick={() => updateMemberPreferences(m.uid, { activeBadge: "" })}
                                                                    className={cn(
                                                                        "text-[10px] px-2 py-1 rounded-lg font-bold transition-all",
                                                                        !activeBadge ? "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                                                    )}
                                                                >
                                                                    Aucun
                                                                </button>
                                                                {earnedBadges.map(badge => (
                                                                    <button
                                                                        key={badge}
                                                                        onClick={() => updateMemberPreferences(m.uid, { activeBadge: badge })}
                                                                        className={cn(
                                                                            "text-[10px] px-2 py-1 rounded-lg font-bold transition-all border",
                                                                            activeBadge === badge
                                                                                ? "bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 scale-105"
                                                                                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-amber-200"
                                                                        )}
                                                                    >
                                                                        {badge}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Account & Connections */}
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 block">Connexions</label>
                                    <div className="space-y-3">
                                        {/* Telegram Notifications */}
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", telegramChatId ? "bg-blue-50 dark:bg-blue-900/20" : "bg-slate-100 dark:bg-slate-700")}>
                                                        <Send size={20} className={telegramChatId ? "text-blue-500" : "text-slate-400"} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">Notifications Telegram</p>
                                                        <p className="text-[10px] font-medium text-slate-400">
                                                            {telegramChatId ? "Connecté" : "Non configuré"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                                Lancez le bot <strong>@LifeSyncBot</strong>, envoyez <code>/start</code> et collez votre ID ci-dessous.
                                            </p>

                                            <div className="flex gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    placeholder="Votre ID Telegram"
                                                    className="flex-1 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-blue-500 placeholder:font-normal"
                                                    value={telegramChatInput}
                                                    onChange={(e) => setTelegramChatInput(e.target.value)}
                                                />
                                                <button
                                                    onClick={saveTelegramId}
                                                    disabled={saving}
                                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            </div>

                                            {telegramChatId && (
                                                <button
                                                    onClick={testTelegram}
                                                    disabled={pushLoading}
                                                    className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 active:scale-95 transition flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                                                >
                                                    <Send size={12} /> Tester la notification
                                                </button>
                                            )}
                                        </div>

                                        {/* Logout Button */}
                                        <button
                                            onClick={async () => {
                                                if (confirm('Se déconnecter de LifeSync ?')) {
                                                    await signOut();
                                                    window.location.reload();
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <LogOut size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-sm">Déconnexion LifeSync</p>
                                                <p className="text-[10px] font-medium opacity-70">Quitter la session en cours</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatePresence>
    );
}
