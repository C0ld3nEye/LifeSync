"use client";

import { useState, useMemo } from "react";
import { useShopping } from "@/hooks/useShopping";
import { useInventory, InventoryItem } from "@/hooks/useInventory";
import { ShoppingCart, Plus, Check, Trash2, Loader, RefreshCw, ChevronDown, ChevronUp, Utensils, Tag, X, ChevronLeft, ChevronRight, HelpCircle, Sparkles, Box, Archive, Snowflake, Search, Calendar, Scale, AlertTriangle, Pencil } from "lucide-react";
import InfoModal from "@/components/ui/InfoModal";
import { ItemCard } from "@/components/shopping/ItemCard";
import { StockModal } from "@/components/shopping/StockModal";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { CATEGORY_ORDER } from "@/lib/shopping";
import { format, endOfWeek, isAfter, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function ShoppingPage() {
    const {
        manualItems,
        mealIngredients,
        mealCheckedItems,
        loading,
        isSortingShop,
        sortedShopList,
        isOutOfSync,
        currentWeekStart,
        addManualItem,
        toggleManualItem,
        removeManualItem,
        toggleMealItem,
        checkMealCategory,
        clearCheckedManualItems,
        changeWeek,
        refreshSort,
        removeMealItem,
        updateManualItem
    } = useShopping();
    const { items: inventoryItems, addItem: addInvItem, updateItem: updateInvItem, removeItem: removeInvItem, consumeItem: consumeInvItem } = useInventory(); // Renamed to avoid clash with local helpers if any

    const [activeTab, setActiveTab] = useState<'shopping' | 'inventory'>('shopping'); // Tab State


    const [showHelp, setShowHelp] = useState(false);

    const [newItem, setNewItem] = useState("");
    const [editingManualId, setEditingManualId] = useState<string | null>(null);
    const [editingMealText, setEditingMealText] = useState<string | null>(null);
    const [showMeals, setShowMeals] = useState(true);

    // Grouping logic for UI
    const manualGrouped = useMemo(() => {
        const checked = manualItems.filter(i => i.checked);
        const unchecked = manualItems.filter(i => !i.checked);
        return { unchecked, checked };
    }, [manualItems]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newItem.trim()) return;

        if (editingManualId) {
            updateManualItem(editingManualId, newItem);
            setEditingManualId(null);
        } else if (editingMealText) {
            removeMealItem(editingMealText);
            addManualItem(newItem);
            setEditingMealText(null);
        } else {
            addManualItem(newItem);
        }
        setNewItem("");
    };

    const handleEditManual = (item: { id: string, text: string }) => {
        setEditingManualId(item.id);
        setEditingMealText(null);
        setNewItem(item.text);
    };

    const handleEditMeal = (text: string) => {
        setEditingMealText(text);
        setEditingManualId(null);
        setNewItem(text);
    };

    const [showStockModal, setShowStockModal] = useState(false);
    const [itemsToStock, setItemsToStock] = useState<{ name: string, quantity: number, unit: string }[]>([]);

    const prepareStocking = () => {
        const manual = manualGrouped.checked.map(i => ({ name: i.text, quantity: 1, unit: 'pcs' }));

        const meal = mealIngredients
            .filter(i => mealCheckedItems.includes(i))
            .map(i => {
                const [name, rest] = i.split(" : ");
                if (!rest) return { name, quantity: 1, unit: 'pcs' };
                const parts = rest.split(" ");
                const quantity = parseFloat(parts[0]) || 1;
                const unit = parts.slice(1).join(" ") || "pcs";
                return { name, quantity, unit };
            });

        setItemsToStock([...manual, ...meal]);
        setShowStockModal(true);
    };

    const finalizeStocking = async (finalItems: typeof itemsToStock) => {
        for (const item of finalItems) {
            await addInvItem({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                category: 'pantry', // default
                expiryDate: null
            });
        }

        // Clear manual items
        await clearCheckedManualItems();

        // Clear meal checked state (Visually indicate complete)
        // We iterate through the stocked items that were from meals and toggle them off
        const mealItemsProcessed = finalItems
            .filter(i => mealCheckedItems.includes(i.name))
            .map(i => i.name);

        if (mealItemsProcessed.length > 0) {
            await checkMealCategory(mealItemsProcessed, false);
        }

        setShowStockModal(false);
    };

    if (loading) return <div className="h-screen flex items-center justify-center text-slate-400"><Loader className="animate-spin" /></div>;

    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });

    return (
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen pb-32 transition-colors">
            {/* Help Modal */}
            <InfoModal
                isOpen={showHelp}
                onClose={() => setShowHelp(false)}
                title="Courses & Inventaire"
                description="Optimisez vos achats et gardez un œil sur vos stocks en temps réel."
                accentColor="emerald"
                items={[
                    { title: "Tri par Rayons", description: "L'IA organise automatiquement vos ingrédients pour vous faire gagner du temps en magasin.", icon: Sparkles, color: "violet" },
                    { title: "Sync Inventaire", description: "Cocher un article ici le déduit (ou l'ajoute) automatiquement à votre stock maison.", icon: Box, color: "blue" },
                    { title: "Planning Intelligent", description: "Utilisez les flèches pour préparer vos courses en avance pour la semaine prochaine.", icon: Utensils, color: "orange" }
                ]}
                tips={[
                    "Validez une catégorie entière d'un coup quand vous avez fini d'en parcourir le rayon.",
                    "La synchronisation avec l'inventaire évite les doublons et le gaspillage alimentaire."
                ]}
            />
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 p-6 sticky top-0 z-30 shadow-sm border-b border-slate-100 dark:border-slate-800 transition-colors">
                <div className="max-w-md mx-auto space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <button onClick={() => changeWeek(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                                <ChevronLeft size={20} />
                            </button>
                            <h1 className="text-2xl font-black bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                                <ShoppingCart className="text-emerald-500" /> Courses
                            </h1>
                            <button onClick={() => setShowHelp(true)} className="text-slate-300 hover:text-emerald-500 transition-colors">
                                <HelpCircle size={20} />
                            </button>
                            <button onClick={() => changeWeek(1)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-400">
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-100 dark:border-slate-700">
                            {format(currentWeekStart, "d MMM", { locale: fr })} - {format(currentWeekEnd, "d MMM", { locale: fr })}
                        </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center gap-2">
                        <button onClick={() => setActiveTab('shopping')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", activeTab === 'shopping' ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-400")}>Liste</button>
                        <button onClick={() => setActiveTab('inventory')} className={cn("flex-1 py-2 text-sm font-bold rounded-lg transition", activeTab === 'inventory' ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" : "text-slate-400")}>Mon Stock</button>
                    </div>
                </div>
            </header>

            {activeTab === 'inventory' ? (
                <main className="max-w-md mx-auto p-4 space-y-8">
                    <InventoryView
                        items={inventoryItems}
                        addItem={addInvItem}
                        updateItem={updateInvItem}
                        removeItem={removeInvItem}
                        consumeItem={consumeInvItem}
                    />
                </main>
            ) : (
                <main className="max-w-md mx-auto p-4 space-y-8">
                    {/* Manual Item Add */}
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if (!newItem.trim()) {
                            alert("Veuillez entrer un nom d'article.");
                            return;
                        }
                        handleAdd(e);
                    }} className="relative group">
                        <input
                            value={newItem}
                            onChange={(e) => setNewItem(e.target.value)}
                            placeholder="Ajouter un article rapide..."
                            className="w-full bg-white dark:bg-slate-900 p-4 pl-12 rounded-2xl shadow-sm border-2 border-transparent focus:border-emerald-500 focus:ring-0 outline-none font-bold text-slate-700 dark:text-slate-200 transition-all"
                        />
                        <Plus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 dark:bg-emerald-600 text-white p-2 rounded-xl active:scale-90 transition-transform">
                            <Plus size={16} />
                        </button>
                    </form>

                    {/* Manual List Section */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-end px-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Tag size={14} className="text-slate-400" /> Articles Manuels
                            </h3>
                            {manualGrouped.checked.length > 0 && (
                                <button onClick={clearCheckedManualItems} className="text-[10px] font-bold text-red-400 hover:text-red-500 flex items-center gap-1 transition-colors">
                                    <Trash2 size={12} /> Nettoyer cochés
                                </button>
                            )}
                        </div>

                        <div className="space-y-2">
                            <AnimatePresence mode="popLayout">
                                {manualGrouped.unchecked.map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        text={item.text}
                                        checked={false}
                                        onToggle={() => toggleManualItem(item.id, true)}
                                        onDelete={() => removeManualItem(item.id)}
                                        onEdit={() => handleEditManual(item)}
                                    />
                                ))}
                                {manualGrouped.checked.map((item) => (
                                    <ItemCard
                                        key={item.id}
                                        text={item.text}
                                        checked={true}
                                        onToggle={() => toggleManualItem(item.id, false)}
                                        onDelete={() => removeManualItem(item.id)}
                                        onEdit={() => handleEditManual(item)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                    </section>

                    {/* Meal Ingredients Section */}
                    <section className="space-y-4">
                        <div
                            onClick={() => setShowMeals(!showMeals)}
                            className="w-full flex justify-between items-center px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors text-left cursor-pointer"
                        >
                            <div className="space-y-1">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Utensils size={14} className="text-orange-500" /> Ingrédients du Menu
                                </h3>
                                {mealIngredients.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        {isOutOfSync ? (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
                                                <div className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                                                <span className="text-[8px] font-black uppercase tracking-wider text-[8px]">À rafraîchir</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                                                <Check size={8} strokeWidth={3} />
                                                <span className="text-[8px] font-black uppercase tracking-wider text-[8px]">Tri à jour</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {mealIngredients.length > 0 && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); refreshSort(); }}
                                        disabled={isSortingShop}
                                        className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 hover:text-orange-500 shadow-sm border border-slate-100 dark:border-slate-800 transition-all"
                                    >
                                        {isSortingShop ? <Loader className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                                    </button>
                                )}
                                {showMeals ? <ChevronUp size={16} className="text-slate-300" /> : <ChevronDown size={16} className="text-slate-300" />}
                            </div>
                        </div>

                        <AnimatePresence>
                            {showMeals && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden space-y-6"
                                >
                                    {mealIngredients.length === 0 ? (
                                        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-400 italic">Aucun ingrédient généré.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Group by category if sorted list exists */}
                                            {sortedShopList ? (
                                                Object.entries(sortedShopList)
                                                    .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
                                                    .map(([cat, items]) => {
                                                        const filteredItems = Array.from(new Set((items as string[]).filter(Boolean)));
                                                        if (filteredItems.length === 0) return null;
                                                        const allChecked = filteredItems.every(it => mealCheckedItems.includes(it));
                                                        return (
                                                            <div key={cat} className="space-y-2">
                                                                <div className="flex justify-between items-center px-1">
                                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cat}</p>
                                                                    <button
                                                                        onClick={() => checkMealCategory(filteredItems, !allChecked)}
                                                                        className={cn(
                                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg transition-all",
                                                                            allChecked
                                                                                ? "bg-slate-100 dark:bg-slate-800 text-slate-400"
                                                                                : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                                                        )}
                                                                    >
                                                                        {allChecked ? "Tout décocher" : "Tout cocher"}
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    {filteredItems.map(it => (
                                                                        <ItemCard
                                                                            key={it}
                                                                            text={it}
                                                                            checked={mealCheckedItems.includes(it)}
                                                                            onToggle={() => toggleMealItem(it)}
                                                                            onDelete={() => removeMealItem(it)}
                                                                            onEdit={() => handleEditMeal(it)}
                                                                            variant="meal"
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                            ) : (
                                                <div className="space-y-1">
                                                    {mealIngredients.map(it => (
                                                        <ItemCard
                                                            key={it}
                                                            text={it}
                                                            checked={mealCheckedItems.includes(it)}
                                                            onToggle={() => toggleMealItem(it)}
                                                            onDelete={() => removeMealItem(it)}
                                                            onEdit={() => handleEditMeal(it)}
                                                            variant="meal"
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>
                </main>
            )}

            <AnimatePresence>
                {(activeTab === 'shopping' && (manualGrouped.checked.length > 0 || mealCheckedItems.length > 0)) && (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-24 left-0 right-0 flex justify-center p-4 z-30 pointer-events-none"
                    >
                        <button
                            onClick={prepareStocking}
                            className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs shadow-2xl shadow-emerald-600/30 flex items-center gap-3 active:scale-95 transition-all pointer-events-auto border-2 border-emerald-500/20 backdrop-blur-md"
                        >
                            <Box size={18} />
                            Stocker mes achats ({manualGrouped.checked.length + mealCheckedItems.length})
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showStockModal && (
                    <StockModal
                        items={itemsToStock}
                        onClose={() => setShowStockModal(false)}
                        onConfirm={finalizeStocking}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}





function InventoryView({ items, addItem, updateItem, removeItem, consumeItem }: {
    items: InventoryItem[],
    addItem: any,
    updateItem: any,
    removeItem: any,
    consumeItem: any
}) {
    const [search, setSearch] = useState("");
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'fridge' | 'freezer' | 'pantry'>('all');
    const [formData, setFormData] = useState<Omit<InventoryItem, 'id' | 'addedAt' | 'updatedAt'>>({
        name: "",
        quantity: 1,
        unit: "pcs",
        category: 'fridge',
        expiryDate: ""
    });

    const filtered = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || item.category === filter;
        return matchesSearch && matchesFilter;
    });

    const categories = [
        { id: 'all', label: 'Tout', icon: Archive, color: 'slate' },
        { id: 'fridge', label: 'Frigo', icon: Box, color: 'blue' },
        { id: 'freezer', label: 'Surgelé', icon: Snowflake, color: 'cyan' },
        { id: 'pantry', label: 'Épicerie', icon: Archive, color: 'amber' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        if (editId) {
            await updateItem(editId, formData);
        } else {
            await addItem(formData);
        }

        setShowForm(false);
        setFormData({ name: "", quantity: 1, unit: "pcs", category: 'fridge', expiryDate: "" });
        setEditId(null);
    };

    const openAdd = () => {
        setEditId(null);
        setFormData({ name: "", quantity: 1, unit: "pcs", category: 'fridge', expiryDate: "" });
        setShowForm(true);
    };

    const openEdit = (item: InventoryItem) => {
        setEditId(item.id);
        setFormData({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            expiryDate: item.expiryDate || ""
        });
        setShowForm(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher dans mon stock..."
                        className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={openAdd}
                    className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                    <Plus size={20} /> Ajouter
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setFilter(cat.id as any)}
                        className={cn(
                            "px-4 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap transition-all font-bold text-sm",
                            filter === cat.id
                                ? `bg-${cat.color}-500 text-white border-transparent shadow-md`
                                : "bg-white dark:bg-slate-900 text-slate-500 border-slate-100 dark:border-slate-800 hover:bg-slate-50"
                        )}
                    >
                        <cat.icon size={16} />
                        {cat.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <AnimatePresence mode="popLayout">
                    {filtered.map(item => (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors uppercase text-sm tracking-tight">{item.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-700">
                                            {item.category === 'fridge' ? 'Frigo' : item.category === 'freezer' ? 'Surgelé' : 'Épicerie'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => openEdit(item)}
                                        className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-all"
                                    >
                                        <Pencil size={16} />
                                    </button>
                                    <button
                                        onClick={() => { if (confirm("Supprimer du stock ?")) removeItem(item.id); }}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <button
                                        onClick={() => consumeItem(item.id, 1)}
                                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm hover:bg-slate-100 transition-all font-bold"
                                    >
                                        -
                                    </button>
                                    <div className="flex flex-col items-center min-w-[40px]">
                                        <span className="text-sm font-black text-slate-800 dark:text-white leading-none">{item.quantity}</span>
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{item.unit}</span>
                                    </div>
                                    <button
                                        onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                                        className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm hover:bg-slate-100 transition-all font-bold"
                                    >
                                        +
                                    </button>
                                </div>

                                {item.expiryDate && (
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all",
                                        isAfter(new Date(), parseISO(item.expiryDate))
                                            ? "bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/30 text-red-500"
                                            : "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500"
                                    )}>
                                        <Calendar size={12} />
                                        <span className="text-[10px] font-bold">
                                            {format(parseISO(item.expiryDate), 'd MMM', { locale: fr })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filtered.length === 0 && (
                <div className="py-20 text-center">
                    <div className="bg-slate-100 dark:bg-slate-800 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4">
                        <Archive className="text-slate-300" size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">Aucun article trouvé dans votre stock.</p>
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border dark:border-slate-800"
                        >
                            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 transition"><X size={20} /></button>
                            <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-8">{editId ? "Modifier l'article" : "Ajouter au stock"}</h3>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Ingrédient</label>
                                    <input
                                        autoFocus
                                        required
                                        placeholder="Ex: Lait, Œufs, Farine..."
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quantité</label>
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-2xl p-1">
                                            <input
                                                type="number"
                                                required
                                                step="any"
                                                className="w-full p-3 bg-transparent font-bold dark:text-white outline-none"
                                                value={formData.quantity}
                                                onChange={e => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                                            />
                                            <select
                                                className="bg-white dark:bg-slate-700 p-2 rounded-xl text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 outline-none border border-slate-100 dark:border-slate-600 mr-1"
                                                value={formData.unit}
                                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            >
                                                <option value="pcs">Pcs</option>
                                                <option value="g">g</option>
                                                <option value="kg">kg</option>
                                                <option value="ml">ml</option>
                                                <option value="l">l</option>
                                                <option value="pack">Pack</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Péremption</label>
                                        <input
                                            type="date"
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-emerald-500/10 transition"
                                            value={formData.expiryDate || ""}
                                            onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Emplacement</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'fridge', label: 'Frigo', icon: Box },
                                            { id: 'freezer', label: 'Surgelé', icon: Snowflake },
                                            { id: 'pantry', label: 'Épicerie', icon: Archive }
                                        ].map(loc => (
                                            <button
                                                key={loc.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, category: loc.id as any })}
                                                className={cn(
                                                    "p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all transition-all",
                                                    formData.category === loc.id
                                                        ? "bg-emerald-50 border-emerald-500 text-emerald-600 dark:bg-emerald-900/20 shadow-sm"
                                                        : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400"
                                                )}
                                            >
                                                <loc.icon size={16} />
                                                <span className="text-[10px] font-bold">{loc.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button type="submit" className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black uppercase text-sm shadow-xl shadow-slate-900/10 active:scale-95 transition-all">
                                    {editId ? "Enregistrer les modifications" : "Ajouter au stock"}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}

