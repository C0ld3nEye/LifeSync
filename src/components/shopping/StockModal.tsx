import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface StockModalProps {
    items: { name: string, quantity: number, unit: string }[];
    onClose: () => void;
    onConfirm: (items: { name: string, quantity: number, unit: string }[]) => void;
}

export function StockModal({ items, onClose, onConfirm }: StockModalProps) {
    const [localItems, setLocalItems] = useState(items);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative border dark:border-slate-800 flex flex-col max-h-[85vh]"
            >
                <button onClick={onClose} className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 transition"><X size={20} /></button>
                <div className="mb-6">
                    <h3 className="font-black text-2xl text-slate-800 dark:text-white mb-1">Mise en stock</h3>
                    <p className="text-xs font-bold text-slate-400">Validez les quantités avant de ranger.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 mb-8 pr-2 scrollbar-hide">
                    {localItems.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-tight">{item.name}</span>
                                <button
                                    onClick={() => setLocalItems(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center bg-white dark:bg-slate-700 rounded-xl p-1 shadow-sm border border-slate-100 dark:border-slate-600 flex-1">
                                    <button
                                        onClick={() => setLocalItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(0, it.quantity - 1) } : it))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        className="w-full bg-transparent text-center font-black text-sm dark:text-white outline-none"
                                        value={item.quantity}
                                        onChange={e => setLocalItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: parseFloat(e.target.value) || 0 } : it))}
                                    />
                                    <button
                                        onClick={() => setLocalItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: it.quantity + 1 } : it))}
                                        className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-600 font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                                <select
                                    className="bg-white dark:bg-slate-700 p-3 rounded-xl text-[10px] font-black uppercase text-slate-500 dark:text-slate-300 outline-none border border-slate-100 dark:border-slate-600"
                                    value={item.unit}
                                    onChange={e => setLocalItems(prev => prev.map((it, i) => i === idx ? { ...it, unit: e.target.value } : it))}
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
                    ))}
                </div>

                <button
                    onClick={() => onConfirm(localItems)}
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase text-sm shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                >
                    Confirmer le rangement
                </button>
            </motion.div>
        </div>
    );
}
