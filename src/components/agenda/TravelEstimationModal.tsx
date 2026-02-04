import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Home, MapPin, X, Check, Navigation, AlertTriangle, Clock } from 'lucide-react';
import { useHousehold } from '@/hooks/useHousehold';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import { format, parseISO, addMinutes, subMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Location {
    label: string;
    lat: number;
    lon: number;
}

interface TravelEstimationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (travelData: { travelTime: number; departureTime: string; alertMargin: number; origin: Location }) => void;
    destination: Location;
    eventStart: string;
}

export default function TravelEstimationModal({ isOpen, onClose, onConfirm, destination, eventStart }: TravelEstimationModalProps) {
    const { household, updateMemberPreferences } = useHousehold();
    const { user } = useAuth();

    // Default home address from prefs
    const homeAddress = household?.memberPreferences?.[user?.uid || '']?.homeAddress as Location | undefined;

    const [origin, setOrigin] = useState<Location | undefined>(homeAddress);
    const [loading, setLoading] = useState(false);
    const [routeData, setRouteData] = useState<{ duration: number; distance: number } | null>(null);
    const [margin, setMargin] = useState(15); // Default margin 15 min
    const [error, setError] = useState<string | null>(null);

    // Initial estimation if home is set
    useEffect(() => {
        if (isOpen && origin && destination) {
            calculateRoute(origin, destination);
        }
    }, [isOpen, origin, destination]);

    const calculateRoute = async (start: Location, end: Location) => {
        setLoading(true);
        setError(null);
        try {
            // Using OSRM Public API (Demo server, check usage policy or user configured server)
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;
            const res = await fetch(url);
            const data = await res.json();

            if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
                const durationSeconds = data.routes[0].duration;
                const distanceMeters = data.routes[0].distance;
                setRouteData({
                    duration: Math.ceil(durationSeconds / 60), // Convert to minutes
                    distance: Math.round(distanceMeters / 1000 * 10) / 10 // Convert to km with 1 decimal
                });
            } else {
                setError("Impossible de calculer l'itinéraire.");
            }
        } catch (err) {
            console.error(err);
            setError("Erreur de connexion au service de routage.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = () => {
        if (!routeData || !origin) return;

        const travelMinutes = routeData.duration;
        const departure = subMinutes(parseISO(eventStart), travelMinutes + margin);

        onConfirm({
            travelTime: travelMinutes,
            departureTime: departure.toISOString(),
            alertMargin: margin,
            origin: origin
        });
    };

    const handleSetHome = async () => {
        // Just a helper to save current origin as home if not set
        // In a real app we might want a dedicated setting, but here we can shortcut
        if (user && origin) {
            await updateMemberPreferences(user.uid, { homeAddress: origin });
            alert("Adresse définie comme Domicile !");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
                >
                    <div className="p-6">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <Car className="text-blue-500" /> Assistant Trajet
                                </h3>
                                <p className="text-xs text-slate-400 font-medium mt-1">Planifiez votre départ sereinement</p>
                            </div>
                            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-red-500 transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Origin Selection */}
                        <div className="mb-6 space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
                                    <Home size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Départ de</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                        {origin ? origin.label : "Aucun domicile défini"}
                                    </p>
                                </div>
                                {!homeAddress && origin && (
                                    <button onClick={handleSetHome} className="text-[10px] items-center gap-1 text-emerald-500 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg hover:bg-emerald-100 transition flex">
                                        <Home size={10} /> Définir Home
                                    </button>
                                )}
                            </div>

                            <div className="flex justify-center">
                                <div className="h-4 w-0.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                    <MapPin size={18} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Destination</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{destination.label}</p>
                                </div>
                            </div>
                        </div>

                        {/* Route Data */}
                        <div className="mb-6">
                            {loading ? (
                                <div className="py-8 text-center">
                                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <p className="text-xs text-slate-400 font-bold">Calcul de l'itinéraire...</p>
                                </div>
                            ) : routeData ? (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{routeData.duration} <span className="text-sm font-bold text-blue-400/70">min</span></p>
                                            <p className="text-[10px] font-bold text-blue-400 uppercase">Durée</p>
                                        </div>
                                        <div className="h-8 w-px bg-blue-200 dark:bg-blue-800"></div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black text-slate-700 dark:text-slate-300">{routeData.distance} <span className="text-sm font-bold text-slate-400">km</span></p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Distance</p>
                                        </div>
                                    </div>

                                    {/* Margin Selector */}
                                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl flex items-center justify-between border border-blue-100 dark:border-blue-800/30">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-orange-500" />
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Marge de sécurité</span>
                                        </div>
                                        <select
                                            value={margin}
                                            onChange={(e) => setMargin(Number(e.target.value))}
                                            className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white text-xs font-bold rounded-lg px-2 py-1 outline-none border-none cursor-pointer"
                                        >
                                            <option value={0}>Aucune</option>
                                            <option value={5}>5 min</option>
                                            <option value={10}>10 min</option>
                                            <option value={15}>15 min</option>
                                            <option value={30}>30 min</option>
                                            <option value={45}>45 min</option>
                                            <option value={60}>1h</option>
                                        </select>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/50 flex justify-between items-center">
                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Heure de départ conseillée :</p>
                                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1 rounded-lg">
                                            {format(subMinutes(parseISO(eventStart), routeData.duration + margin), "HH:mm")}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/10 rounded-xl">
                                    {error || "Adresse de départ manquante"}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold rounded-xl text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Ignorer trajet
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={!routeData}
                                className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <Navigation size={16} /> Valider le départ
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
