import {
    ShoppingCart, Home, Coffee, FileText, MoreHorizontal,
    Wifi, Droplets, Zap, Tv, Shield, Phone, Car, Heart, Gift, Plane, Music, Dumbbell, BookOpen, Utensils,
    PiggyBank, Landmark, PawPrint, Baby, Hammer, Sparkles, Banknote, Shirt
} from "lucide-react";

export const CATEGORIES = [
    { id: 'loyer', label: 'Logement', icon: Home, color: 'bg-blue-100 text-blue-600', solidColor: 'bg-blue-500' },
    { id: 'courses', label: 'Courses', icon: ShoppingCart, color: 'bg-emerald-100 text-emerald-600', solidColor: 'bg-emerald-500' },
    { id: 'transport', label: 'Transport', icon: Car, color: 'bg-indigo-100 text-indigo-600', solidColor: 'bg-indigo-500' },
    { id: 'resto', label: 'Resto', icon: Utensils, color: 'bg-amber-100 text-amber-600', solidColor: 'bg-amber-500' },
    { id: 'sante', label: 'Santé', icon: Heart, color: 'bg-rose-100 text-rose-600', solidColor: 'bg-rose-500' },
    { id: 'animaux', label: 'Animaux', icon: PawPrint, color: 'bg-orange-100 text-orange-600', solidColor: 'bg-orange-600' },
    { id: 'enfant', label: 'Enfants', icon: Baby, color: 'bg-cyan-100 text-cyan-600', solidColor: 'bg-cyan-500' },
    { id: 'maison', label: 'Maison & Déco', icon: Hammer, color: 'bg-slate-100 text-slate-800', solidColor: 'bg-slate-600' },
    { id: 'beaute', label: 'Beauté & Soins', icon: Sparkles, color: 'bg-pink-50 text-pink-500', solidColor: 'bg-pink-400' },
    { id: 'vetements', label: 'Vêtements', icon: Shirt, color: 'bg-fuchsia-100 text-fuchsia-600', solidColor: 'bg-fuchsia-500' },
    { id: 'plaisir', label: 'Plaisir / Sorties', icon: Coffee, color: 'bg-purple-100 text-purple-600', solidColor: 'bg-purple-500' },
    { id: 'cadeau', label: 'Cadeaux', icon: Gift, color: 'bg-red-100 text-red-600', solidColor: 'bg-red-500' },
    { id: 'vacances', label: 'Vacances', icon: Plane, color: 'bg-sky-100 text-sky-600', solidColor: 'bg-sky-500' },
    { id: 'impot', label: 'Impôts & Taxes', icon: Banknote, color: 'bg-stone-100 text-stone-600', solidColor: 'bg-stone-500' },
    { id: 'epargne', label: 'Épargne', icon: PiggyBank, color: 'bg-lime-100 text-lime-600', solidColor: 'bg-lime-500' },
    { id: 'pret', label: 'Prêt / Dette', icon: Landmark, color: 'bg-yellow-100 text-yellow-700', solidColor: 'bg-yellow-600' },
    { id: 'assurance', label: 'Assurance', icon: Shield, color: 'bg-teal-100 text-teal-600', solidColor: 'bg-teal-600' },
    { id: 'facture', label: 'Factures diverses', icon: FileText, color: 'bg-gray-100 text-gray-600', solidColor: 'bg-gray-500' },
    { id: 'autre', label: 'Autre', icon: MoreHorizontal, color: 'bg-slate-50 text-slate-500', solidColor: 'bg-slate-400' },
];

export const SUBSCRIPTION_CATEGORIES = [
    { id: 'loyer', label: 'Loyer / Crédit Immo', icon: Home, color: 'bg-blue-100 text-blue-600', solidColor: 'bg-blue-500' },
    { id: 'internet', label: 'Internet', icon: Wifi, color: 'bg-indigo-100 text-indigo-600', solidColor: 'bg-indigo-500' },
    { id: 'eau', label: 'Eau', icon: Droplets, color: 'bg-blue-100 text-blue-600', solidColor: 'bg-blue-500' },
    { id: 'elec', label: 'Électricité / Gaz', icon: Zap, color: 'bg-yellow-100 text-yellow-600', solidColor: 'bg-yellow-500' },
    { id: 'assurance', label: 'Assurance', icon: Shield, color: 'bg-teal-100 text-teal-600', solidColor: 'bg-teal-600' },
    { id: 'tel', label: 'Téléphonie', icon: Phone, color: 'bg-cyan-100 text-cyan-600', solidColor: 'bg-cyan-500' },
    { id: 'streaming', label: 'Streaming / SVOD', icon: Tv, color: 'bg-rose-100 text-rose-600', solidColor: 'bg-rose-500' },
    { id: 'musique', label: 'Musique', icon: Music, color: 'bg-fuchsia-100 text-fuchsia-600', solidColor: 'bg-fuchsia-500' },
    { id: 'sport', label: 'Sport / Salle', icon: Dumbbell, color: 'bg-emerald-100 text-emerald-600', solidColor: 'bg-emerald-500' },
    { id: 'logiciel', label: 'Logiciels / Apps', icon: FileText, color: 'bg-slate-100 text-slate-600', solidColor: 'bg-slate-500' },
    { id: 'banque', label: 'Frais Bancaires', icon: Landmark, color: 'bg-gray-100 text-gray-600', solidColor: 'bg-gray-500' },
    { id: 'pret', label: 'Remb. Prêt', icon: Banknote, color: 'bg-orange-100 text-orange-600', solidColor: 'bg-orange-500' },
    { id: 'epargne', label: 'Virement Auto (Épargne)', icon: PiggyBank, color: 'bg-lime-100 text-lime-600', solidColor: 'bg-lime-500' },
    { id: 'scolaire', label: 'Frais Scolaires', icon: BookOpen, color: 'bg-violet-100 text-violet-600', solidColor: 'bg-violet-500' },
];

// For the generalized selector, we want a clean, sorted list without duplicates
export const ALL_CATEGORIES = [
    ...CATEGORIES,
    ...SUBSCRIPTION_CATEGORIES
].filter((cat, index, self) =>
    index === self.findIndex((c) => c.id === cat.id)
);
