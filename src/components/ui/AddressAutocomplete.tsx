import { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, Building, TreePine, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    class: string;
    address?: {
        road?: string;
        postcode?: string;
        city?: string;
        town?: string;
        village?: string;
        country?: string;
        house_number?: string;
    }
}

export interface AddressResult {
    label: string;
    lat: number;
    lon: number;
}

interface AddressAutocompleteProps {
    value: AddressResult | string; // Backward compatibility for display
    onChange: (value: AddressResult) => void;
    placeholder?: string;
    className?: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder = "Rechercher une adresse...", className }: AddressAutocompleteProps) {
    // Handle both string (legacy) and object (new) values for initial state
    const [query, setQuery] = useState(typeof value === 'string' ? value : value?.label || "");
    const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value changes
    useEffect(() => {
        setQuery(typeof value === 'string' ? value : value?.label || "");
    }, [value]);

    // ... (UseEffect click outside remains same) ...
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // ... searchAddress remains same ...
    const searchAddress = async (searchTerm: string) => {
        if (!searchTerm || searchTerm.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            // Using Nominatim API
            const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchTerm)}&format=json&addressdetails=1&limit=5&countrycodes=fr`);
            const data = await response.json();
            setSuggestions(data || []);
            setIsOpen(true);
        } catch (error) {
            console.error("Address search failed", error);
        } finally {
            setLoading(false);
        }
    };


    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setQuery(newVal);
        // Dont trigger onChange for parent yet if typing manually, or pass partial object?
        // Let's pass a "partial" object if user just types, lat/lon will be 0
        onChange({ label: newVal, lat: 0, lon: 0 });

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            searchAddress(newVal);
        }, 600);
    };

    const selectAddress = (item: NominatimResult) => {
        const fullAddress = item.display_name;
        setQuery(fullAddress);
        onChange({
            label: fullAddress,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon)
        });
        setIsOpen(false);
    };

    const getIcon = (item: NominatimResult) => {
        if (item.class === 'leisure' || item.class === 'tourism') return <TreePine size={14} className="text-emerald-500" />;
        if (item.class === 'shop') return <ShoppingBag size={14} className="text-orange-500" />;
        return <Building size={14} className="text-blue-500" />;
    }

    return (
        <div className="relative w-full" ref={containerRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
                    placeholder={placeholder}
                    className={cn(
                        "w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 dark:text-white rounded-xl border-none outline-emerald-500 placeholder:text-slate-400 transition-all",
                        className
                    )}
                />
                {loading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="animate-spin text-emerald-500" size={18} />
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isOpen && suggestions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden max-h-60 overflow-y-auto"
                    >
                        {suggestions.map((item) => (
                            <button
                                key={item.place_id}
                                type="button"
                                onClick={() => selectAddress(item)}
                                className="w-full text-left px-4 py-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors flex items-start gap-3"
                            >
                                <div className="mt-0.5 shrink-0 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-lg">
                                    {getIcon(item)}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm truncate w-full">
                                        {item.display_name.split(',')[0]}
                                    </span>
                                    <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                                        {item.display_name.split(',').slice(1).join(',').trim()}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
