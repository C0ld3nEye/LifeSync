"use client";

import { motion } from "framer-motion";
import { Quote, Edit2 } from "lucide-react";
import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";

interface MottoWidgetProps {
    household: any;
}

export default function MottoWidget({ household }: MottoWidgetProps) {
    const { updatePreferences } = useHousehold();
    const [isEditing, setIsEditing] = useState(false);
    const [motto, setMotto] = useState(household?.preferences?.motto || "La vie est belle en famille ! ✨");

    const handleSave = async () => {
        await updatePreferences({ motto });
        setIsEditing(false);
    };

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 relative group">
            <div className="absolute top-4 left-4 text-slate-100 dark:text-slate-800">
                <Quote size={40} fill="currentColor" />
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center py-4">
                {isEditing ? (
                    <div className="w-full space-y-3 text-center">
                        <textarea
                            value={motto}
                            onChange={(e) => setMotto(e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 text-sm font-bold text-center focus:ring-2 focus:ring-emerald-500 outline-none"
                            rows={2}
                            autoFocus
                        />
                        <button
                            onClick={handleSave}
                            className="bg-emerald-500 text-white px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
                        >
                            Enregistrer
                        </button>
                    </div>
                ) : (
                    <div className="text-center group-hover:px-4 transition-all">
                        <p className="text-lg font-black text-slate-800 dark:text-white italic leading-relaxed">
                            "{motto}"
                        </p>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Edit2 size={14} />
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
