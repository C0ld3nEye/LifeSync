
import { useState, useEffect } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/components/providers/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, AlertCircle, PackageOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { ANIMALS, RARITY_CONFIG, AnimalCard } from "@/lib/collection";
import { Card, CardDetails } from "./Card";

// Helper to Safelist tailwind colors dynamically used in Card.tsx/Here
// text-slate-500 text-blue-500 text-purple-500 text-orange-500 text-rose-500
// bg-slate-500 bg-blue-500 bg-purple-500 bg-orange-500 bg-rose-500
// border-slate-500 border-blue-500 border-purple-500 border-orange-500 border-rose-500
// from-slate-400 from-blue-400 from-purple-400 from-orange-400 from-rose-400
// to-slate-600 to-blue-600 to-purple-600 to-orange-600 to-rose-600

interface CollectionZoneProps {
    isOpen: boolean;
    onClose: () => void;
    embedded?: boolean;
}

export default function CollectionZone({ isOpen, onClose, embedded = false }: CollectionZoneProps) {
    const { household, openPack, buyPack, tradeUp } = useHousehold();
    const { user } = useAuth();
    const [selectedCard, setSelectedCard] = useState<AnimalCard | null>(null);
    const [isOpening, setIsOpening] = useState(false);
    const [justOpenedCard, setJustOpenedCard] = useState<AnimalCard | null>(null);
    const [viewingUserId, setViewingUserId] = useState<string | null>(null);

    // Initialize viewingUserId when user loads
    useEffect(() => {
        if (user && !viewingUserId) {
            setViewingUserId(user.uid);
        }
    }, [user]);

    if ((!isOpen && !embedded) || !household || !user) return null;

    const currentViewerId = viewingUserId || user.uid;
    const isOwner = currentViewerId === user.uid;

    const userCollection = household.collections?.[currentViewerId] || {};
    const unopenedPacks = household.unopenedPacks?.[currentViewerId] || 0;

    // Sort animals: Owned first, then by rarity (desc), then by ID
    const sortedAnimals = [...ANIMALS].sort((a, b) => {
        const ownedA = !!userCollection[a.id];
        const ownedB = !!userCollection[b.id];

        // Prioritize owned
        // if (ownedA && !ownedB) return -1;
        // if (!ownedA && ownedB) return 1;

        // Prioritize Rarity (Reverse order of config definition slightly tricky, let's just map rarity to score)
        const rarityScore = { totem: 5, legendary: 4, epic: 3, rare: 2, common: 1 };
        const scoreA = rarityScore[a.rarity];
        const scoreB = rarityScore[b.rarity];

        if (scoreA !== scoreB) return scoreB - scoreA;

        return a.name.localeCompare(b.name);
    });

    const handleOpenPack = async () => {
        if (isOpening || unopenedPacks <= 0) return;
        setIsOpening(true);

        try {
            // Delay for dramatic effect
            await new Promise(r => setTimeout(r, 1500));
            const card = await openPack(user.uid);

            if (card) {
                setJustOpenedCard(card);
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: [RARITY_CONFIG[card.rarity].color] // Try to match rarity color
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsOpening(false);
        }
    };

    const Content = (
        <div className={cn("flex flex-col h-full", embedded ? "min-h-[50vh]" : "max-h-[90vh]")}>
            {/* Header */}
            {!embedded && (
                <div className="p-6 bg-gradient-to-br from-indigo-900 to-slate-900 text-white shrink-0 relative overflow-hidden">
                    {/* Decorative background elements */}
                    <div className="absolute top-0 right-0 p-10 opacity-10 transform translate-x-10 -translate-y-10">
                        <Trophy size={150} />
                    </div>

                    {/* Member Selector (Desktop/Mobile) */}
                    <div className="absolute bottom-4 left-6 right-6 z-30 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {household.memberProfiles?.map((member) => (
                            <button
                                key={member.uid}
                                onClick={() => setViewingUserId(member.uid)}
                                className={cn(
                                    "flex items-center gap-2 p-1.5 pr-4 rounded-full transition-all border shrink-0",
                                    viewingUserId === member.uid
                                        ? "bg-white/20 border-white/40 text-white backdrop-blur-md"
                                        : "bg-black/20 border-transparent text-white/50 hover:bg-black/30"
                                )}
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border-2 border-white/20">
                                    {member.photoURL ? (
                                        <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                                            {member.displayName.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-bold truncate max-w-[80px]">
                                    {member.uid === user.uid ? "Moi" : member.displayName}
                                </span>
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition z-20"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-2xl font-black flex items-center gap-2 relative z-10">
                        <Trophy className="text-yellow-400" /> Collection
                    </h2>
                    <p className="opacity-60 text-xs font-bold uppercase tracking-widest mt-1 relative z-10">Attrapez-les tous !</p>
                </div>
            )}

            {embedded && (
                <div className="mb-6 bg-gradient-to-r from-indigo-900 to-slate-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Trophy size={100} />
                    </div>
                    <div className="flex flex-col gap-4 relative z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-black flex items-center gap-2 mb-1">
                                    <Trophy className="text-yellow-400" /> {isOwner ? "Ma Collection" : "Collection"}
                                </h2>
                                <p className="text-xs opacity-60 font-bold uppercase tracking-wider">
                                    {Object.keys(userCollection).length} / {ANIMALS.length} animaux
                                </p>
                            </div>
                            {unopenedPacks > 0 && isOwner && (
                                <div className="bg-yellow-500 text-yellow-950 px-3 py-1 rounded-full font-black text-xs animate-pulse shadow-lg shadow-yellow-500/20">
                                    {unopenedPacks} Packet(s) !
                                </div>
                            )}
                        </div>

                        {/* Member Selector (Embedded) */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 mt-2">
                            {household.memberProfiles?.map((member) => (
                                <button
                                    key={member.uid}
                                    onClick={() => setViewingUserId(member.uid)}
                                    className={cn(
                                        "flex items-center gap-2 p-1 pr-3 rounded-full transition-all border shrink-0",
                                        viewingUserId === member.uid
                                            ? "bg-white/20 border-white/40 text-white backdrop-blur-md"
                                            : "bg-black/20 border-transparent text-white/50 hover:bg-black/30"
                                    )}
                                >
                                    <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden border border-white/20">
                                        {member.photoURL ? (
                                            <img src={member.photoURL} alt={member.displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                                                {member.displayName.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold truncate max-w-[60px]">
                                        {member.uid === user.uid ? "Moi" : member.displayName}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-1 space-y-6 relative">

                {/* PACK OPENING SECTION (Only if Owner) */}
                <AnimatePresence>
                    {isOwner && unopenedPacks > 0 && !justOpenedCard && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-3xl p-1 shadow-xl mb-6 mx-2"
                        >
                            <div className="bg-white/10 backdrop-blur-sm rounded-[1.3rem] p-6 text-center flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center animate-bounce">
                                    <PackageOpen size={40} className="text-white" />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-black uppercase italic tracking-tighter">Pack Disponible !</h3>
                                    <p className="text-xs font-bold opacity-90">Obtenu en étant Champion</p>
                                </div>
                                <button
                                    onClick={handleOpenPack}
                                    disabled={isOpening}
                                    className="w-full bg-white text-orange-600 py-3 rounded-xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                                >
                                    {isOpening ? "Ouverture..." : "OUVRIR MAINTENANT"}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Just Opened Reveal */}
                <AnimatePresence>
                    {justOpenedCard && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-6"
                            onClick={() => setJustOpenedCard(null)}
                        >
                            <div className="text-center w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                <motion.div
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="mb-8"
                                >
                                    <h2 className="text-3xl font-black text-white mb-2">C'est gagné !</h2>
                                    <p className="text-white/60 font-bold uppercase tracking-widest">Nouvel ami ajouté</p>
                                </motion.div>

                                <div className="flex justify-center mb-8">
                                    <Card card={justOpenedCard} count={1} size="xl" showDetails />
                                </div>

                                <button
                                    onClick={() => setJustOpenedCard(null)}
                                    className="bg-white text-slate-900 py-4 px-8 rounded-full font-black shadow-xl hover:scale-110 transition-transform"
                                >
                                    Génial !
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>


                {/* Store Button Update */}
                {isOwner && (
                    <div className="mx-4 mb-8 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 dark:border-slate-700">
                        <div>
                            <p className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider mb-1">Votre Solde</p>
                            <p className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                {household.balance?.[user.uid] || household.scores?.[user.uid] || 0} <span className="text-sm font-bold opacity-50">pts</span>
                            </p>
                        </div>

                        <button
                            onClick={async () => {
                                try {
                                    await buyPack(user.uid);
                                } catch (e: any) {
                                    alert(e.message);
                                }
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-lg shadow-indigo-500/20 active:scale-95 flex flex-col items-center"
                        >
                            <span>Acheter un Pack</span>
                            <span className="text-[10px] opacity-80 font-normal">
                                {(Object.keys(userCollection).length === 0) ? "GRATUIT (Bienvenue)" : "750 points"}
                            </span>
                        </button>
                    </div>
                )}

                {/* --- OWNED CARDS SECTION --- */}
                <div className="mb-12">
                    <h3 className="px-6 mb-4 text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        🌟 {isOwner ? "Mes Animaux" : "Ses Animaux"}
                        <span className="text-sm opacity-50 font-bold bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">{Object.keys(userCollection).length}</span>
                    </h3>

                    <div className="space-y-8">
                        {(['totem', 'legendary', 'epic', 'rare', 'common'] as const).map(rarity => {
                            const ownedInRarity = sortedAnimals.filter(a => a.rarity === rarity && !!userCollection[a.id]);
                            if (ownedInRarity.length === 0) return null;
                            const config = RARITY_CONFIG[rarity];

                            return (
                                <div key={`owned-${rarity}`} className="px-2">
                                    {/* Simple divider for rarity within owned */}
                                    <div className="flex items-center gap-2 mb-3 px-2">
                                        <div className={cn("h-px w-8 bg-gradient-to-r from-transparent", `to-${config.color}-500/50`)} />
                                        <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded opacity-80", `text-${config.color}-600 dark:text-${config.color}-400`)}>
                                            {config.label}
                                        </span>
                                        <div className={cn("h-px flex-1 bg-gradient-to-r from-transparent to-slate-100 dark:to-slate-800 opacity-50")} />
                                    </div>

                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                        {ownedInRarity.map((animal) => (
                                            <div key={animal.id} className="flex justify-center">
                                                <Card
                                                    card={animal}
                                                    count={userCollection[animal.id]}
                                                    size="md"
                                                    onClick={() => setSelectedCard(animal)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(userCollection).length === 0 && (
                            <div className="text-center p-8 opacity-50">
                                <p>{isOwner ? "Vous n'avez pas encore de cartes. Ouvrez un pack !" : "Ce membre n'a pas encore de cartes."}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- LOCKED CARDS SECTION (Only for Owner) --- */}
                {isOwner && (
                    <div className="pb-20 opacity-80">
                        <h3 className="px-6 mb-4 text-lg font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            🔒 Non Débloqués
                            <span className="text-sm opacity-50">({ANIMALS.length - Object.keys(userCollection).length} restants)</span>
                        </h3>

                        <div className="space-y-4">
                            {(['totem', 'legendary', 'epic', 'rare', 'common'] as const).map(rarity => {
                                const lockedInRarity = sortedAnimals.filter(a => a.rarity === rarity && !userCollection[a.id]);
                                if (lockedInRarity.length === 0) return null;
                                // Only show if there are locked cards in this rarity

                                return (
                                    <div key={`locked-${rarity}`} className="px-2 grayscale hover:grayscale-0 transition-all duration-500">
                                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                            {lockedInRarity.map((animal) => (
                                                <div key={animal.id} className="flex justify-center">
                                                    <Card
                                                        card={animal}
                                                        count={0}
                                                        size="md"
                                                        onClick={() => {/* Locked */ }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {selectedCard && (
                <CardDetails
                    card={selectedCard}
                    count={userCollection[selectedCard.id] || 0}
                    onTrade={async () => {
                        if (!selectedCard) return;
                        try {
                            const newCard = await tradeUp(user.uid, selectedCard.id);
                            if (newCard) {
                                setSelectedCard(null);
                                setJustOpenedCard(newCard);
                                confetti({
                                    particleCount: 150,
                                    spread: 100,
                                    origin: { y: 0.6 },
                                    colors: [RARITY_CONFIG[newCard.rarity].color]
                                });
                            }
                        } catch (e: any) {
                            alert(e.message);
                        }
                    }}
                    onClose={() => setSelectedCard(null)}
                    hideDetails={!isOwner}
                />
            )}
        </div>
    );

    if (embedded) return Content;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                className="relative w-full max-w-2xl bg-slate-50 dark:bg-slate-950 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {Content}
            </motion.div>
        </div>
    );
}
