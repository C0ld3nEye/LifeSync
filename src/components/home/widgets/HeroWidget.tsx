import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Coffee, PartyPopper, Cloud, Sun, Thermometer, Wind, CloudRain, Loader2, Plane, Moon, Sofa } from "lucide-react";
import { HouseholdData, useHousehold } from "@/hooks/useHousehold";
import { useWeather } from "@/hooks/useWeather";
import { useAuth } from "@/components/providers/AuthProvider";
import { generateHeroAIContent } from "@/lib/gemini";
import { cn } from "@/lib/utils";

interface HeroWidgetProps {
    household: HouseholdData;
    todayStr: string;
}

export default function HeroWidget({ household, todayStr }: HeroWidgetProps) {
    const { user } = useAuth();
    const { updateAIWidgetConfig } = useHousehold();
    const { weather, getWeatherIcon, loading } = useWeather();
    const [aiContent, setAiContent] = useState<{ weatherSummary: string; funnyRemark: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bonjour" :
        hour < 14 ? "Bon appétit" :
            hour < 18 ? "Bon après-midi" :
                "Bonsoir";

    const userProfile = household.memberProfiles?.find(p => p.uid === user?.uid);
    const displayName = userProfile?.displayName || user?.displayName || "Membre";
    const firstName = displayName.split(' ')[0];

    const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode, weather.isDay) : Sparkles;
    const motto = household.preferences?.motto || "La vie est belle en famille ! ✨";
    const energyLevel = household.energyLevel || 'chill';

    const energyIcons: Record<string, any> = {
        chill: { icon: Sofa, label: 'Chill', color: 'text-amber-400' },
        work: { icon: Coffee, label: 'Travail', color: 'text-blue-400' },
        productive: { icon: Zap, label: 'Productif', color: 'text-emerald-400' },
        party: { icon: PartyPopper, label: 'Fête', color: 'text-pink-400' },
        travel: { icon: Plane, label: 'Voyage', color: 'text-blue-400' },
    };

    const currentEnergy = energyIcons[energyLevel] || energyIcons.chill;

    useEffect(() => {
        const fetchAI = async (force = false) => {
            if (!weather || !household) return;

            const hour = new Date().getHours();
            const timeOfDay = hour < 12 ? "morning" : hour < 14 ? "noon" : hour < 18 ? "afternoon" : "evening";
            const today = new Date().toISOString().split('T')[0];

            // 1. Shared Cache Logic (Firestore)
            const config = household.aiWidgetConfig;
            if (config?.heroFunnyRemark && config?.heroLastUpdate && !force) {
                const lastUpdateDate = config.heroLastUpdate.split('T')[0];
                const lastUpdateTime = new Date(config.heroLastUpdate).getTime();
                const isFresh = (Date.now() - lastUpdateTime) < 4 * 3600 * 1000; // 4 hours freshness

                if (isFresh && lastUpdateDate === today) {
                    setAiContent({
                        weatherSummary: config.heroWeatherSummary || "",
                        funnyRemark: config.heroFunnyRemark || ""
                    });
                    return;
                }
            }

            // 2. Local Storage Backup (optional, but Firestore is primary)
            const cacheKey = `hero_ai_${household.id}`;

            setAiLoading(true);
            try {
                const content = await generateHeroAIContent(weather, household);
                setAiContent(content);

                // 3. Save to Global Cache
                await updateAIWidgetConfig({
                    heroWeatherSummary: content.weatherSummary,
                    heroFunnyRemark: content.funnyRemark,
                    heroLastUpdate: new Date().toISOString()
                });

            } catch (e) {
                console.error("AI Hero Error:", e);
            } finally {
                setAiLoading(false);
            }
        };

        fetchAI();

        const interval = setInterval(() => fetchAI(true), 4 * 3600 * 1000); // Check every 4h
        return () => clearInterval(interval);
    }, [weather?.weatherCode, energyLevel, household?.id]);

    const item = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } as const },
    };

    return (
        <motion.div variants={item} className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[3rem] p-8 text-white shadow-2xl border border-white/5">
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />

            <div className="relative z-10 space-y-8">
                {/* Header: Greeting & Motto */}
                <div className="flex justify-between items-start gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <div className={cn("p-1.5 rounded-lg bg-white/5", currentEnergy.color)}>
                                <currentEnergy.icon size={12} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{todayStr}</span>
                        </div>
                        <h2 className="text-4xl font-[1000] tracking-tighter leading-none">{greeting}, {firstName}</h2>
                    </div>

                    {/* Energy Badge */}
                    <div className="px-4 py-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-white/40 tracking-widest">{currentEnergy.label}</span>
                    </div>
                </div>

                {/* Weather Section: Large & Detailed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 backdrop-blur-md rounded-[2.5rem] p-8 border border-white/10 shadow-inner">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <WeatherIcon size={80} className="text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.4)]" />
                            {weather?.isDay === false && <Moon size={24} className="absolute -top-2 -right-2 text-indigo-300" />}
                        </div>
                        <div>
                            <div className="flex items-baseline">
                                <span className="text-6xl font-[1000] tracking-tighter">{weather?.temperature || '--'}</span>
                                <span className="text-2xl font-black text-white/30 ml-1">°C</span>
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest text-white/50 bg-white/5 px-3 py-1 rounded-full w-fit mt-2">
                                {aiLoading ? (
                                    <span className="flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> Analyse...</span>
                                ) : (
                                    aiContent?.weatherSummary || "Météo Locale"
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Hourly Forecast */}
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide border-l border-white/10 pl-6">
                        {weather?.hourly?.time.slice(hour, hour + 5).map((t, idx) => {
                            const h = new Date(t).getHours();
                            const HourlyIcon = getWeatherIcon(weather.hourly!.weatherCode[hour + idx], h > 6 && h < 20);
                            return (
                                <div key={t} className="flex flex-col items-center gap-2 min-w-[50px]">
                                    <span className="text-[10px] font-black text-white/40">{h}h</span>
                                    <HourlyIcon size={20} className="text-white/80" />
                                    <span className="text-xs font-black">{Math.round(weather.hourly!.temperature2m[hour + idx])}°</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Snippet: Funny Comment */}
                <AnimatePresence>
                    {aiContent && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-indigo-500/20 border border-indigo-400/20 p-5 rounded-3xl flex items-start gap-4"
                        >
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.4)]">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-[1000] uppercase tracking-[0.2em] text-indigo-300">Note de l'IA</p>
                                <p className="text-lg font-black leading-tight text-white/95 italic">
                                    "{aiContent.funnyRemark}"
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
