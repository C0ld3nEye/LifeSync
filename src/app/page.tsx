"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, CheckSquare, Utensils, Wallet,
  Loader, Settings, ChevronRight, Trophy,
  ArrowUpRight, Clock, Star, Sparkles, Plus, Layout,
  Bell, BellOff, HelpCircle, MessageSquare
} from "lucide-react";
import Link from "next/link";
import { useHousehold } from "@/hooks/useHousehold";
import { useAgenda } from "@/hooks/useAgenda";
import { useSmartMeal } from "@/hooks/useSmartMeal";
import { useChores } from "@/hooks/useChores";
import { useBudget } from "@/hooks/useBudget";
import { useWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/components/providers/AuthProvider";
import HouseholdSetup from "@/components/household/HouseholdSetup";
import HouseholdSettings from "@/components/household/HouseholdSettings";
import HomeSettings, { DEFAULT_WIDGETS } from "@/components/home/HomeSettings";
import { format, parseISO, endOfDay, isWithinInterval, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Widget Imports
import HeroWidget from "@/components/home/widgets/HeroWidget";
import AgendaWidget from "@/components/home/widgets/AgendaWidget";
import MealWidget from "@/components/home/widgets/MealWidget";
import ChoreWidget from "@/components/home/widgets/ChoreWidget";
import BudgetWidget from "@/components/home/widgets/BudgetWidget";
import LeaderboardWidget from "@/components/home/widgets/LeaderboardWidget";
import ShoppingWidget from "@/components/home/widgets/ShoppingWidget";
import BudgetBalanceWidget from "@/components/home/widgets/BudgetBalanceWidget";
import BudgetNextWidget from "@/components/home/widgets/BudgetNextWidget";
import BudgetSavingsWidget from "@/components/home/widgets/BudgetSavingsWidget";
import ChoresCircleWidget from "@/components/home/widgets/ChoresCircleWidget";
import QuickActionsWidget from "@/components/home/widgets/QuickActionsWidget";
import MottoWidget from "@/components/home/widgets/MottoWidget";
import AgendaTodayWidget from "@/components/home/widgets/AgendaTodayWidget";
import MealsNextWidget from "@/components/home/widgets/MealsNextWidget";
import EnergyWidget from "@/components/home/widgets/EnergyWidget";
import AIChatWidget from "@/components/home/widgets/AIChatWidget";
import HumorWidget from "@/components/home/widgets/HumorWidget";
import PriceWatchWidget from "@/components/home/widgets/PriceWatchWidget";
import ProjectsWidget from "@/components/home/widgets/ProjectsWidget";
import HealthWidget from "@/components/home/widgets/HealthWidget";
import ChallengeWidget from "@/components/home/widgets/ChallengeWidget";
import MemoWidget from "@/components/home/widgets/MemoWidget";
import PollWidget from "@/components/home/widgets/PollWidget";
import InfoModal from "@/components/ui/InfoModal";

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { household, loading: hLoading, updateAIWidgetConfig } = useHousehold();
  const { events } = useAgenda();
  const { menu, sortedShopList } = useSmartMeal();
  const { chores } = useChores();
  const { expenses } = useBudget();
  const { wishlist } = useWishlist();

  const [showSettings, setShowSettings] = useState(false);
  const [showHomeCustomizer, setShowHomeCustomizer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default');

  // Check permission on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      if (!("Notification" in window)) {
        setNotifPermission('unsupported');
      } else {
        setNotifPermission(Notification.permission);
      }
    }
  });

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("Ce navigateur ne supporte pas les notifications.");
      return;
    }

    if (Notification.permission === "granted") {
      alert("Les notifications sont déjà activées.");
      return;
    }

    if (Notification.permission === "denied") {
      alert("Les notifications sont bloquées par votre navigateur. Veuillez les autoriser dans les paramètres du site.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    if (permission === "granted") {
      new Notification("🔔 LifeSync", { body: "Notifications configurées !", icon: "/icon-192x192.png" });
    }
  };

  // UNIFIED LOADING STATE (Prevents Login Flash)
  const showSplash = authLoading || (user && hLoading);

  if (showSplash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-6"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute inset-0 bg-emerald-400 rounded-full blur-xl opacity-50"
            />
            <img src="/logo.png" alt="LifeSync" className="w-24 h-24 rounded-full shadow-2xl relative z-10 border-4 border-white dark:border-slate-800" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black uppercase tracking-[0.3em] text-slate-800 dark:text-white">LifeSync</h1>
            <p className="text-sm font-bold text-emerald-500 uppercase tracking-widest animate-pulse">Chargement...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!household) return <HouseholdSetup />;

  const userWidgetsRaw = household.memberPreferences?.[user?.uid || '']?.widgets || DEFAULT_WIDGETS;
  // [MIGRATION] Map legacy 'ai_widget' to 'ai_chat'
  const userWidgets = userWidgetsRaw.map(id => id === 'ai_widget' ? 'ai_chat' : id);

  const todayStr = format(new Date(), "EEEE d MMMM", { locale: fr });
  const dayName = format(new Date(), "EEEE", { locale: fr });
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);

  const todaysMenu = menu[capitalizedDay];
  const today = new Date();
  const nextEvents = events
    .filter(e => {
      const end = endOfDay(parseISO(e.end));
      return end >= today;
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 2);

  // Filter Logic matching Chores Page
  const filteredChores = chores.filter(c => {
    // Keep done tasks for statistics, but if undone, check the recurrence filter
    if (c.done) return true;

    // If it's a household recurring task, only show if due today or earlier (or no due date)
    if (c.category === 'household' || (!c.category && c.frequency !== 'once')) {
      if (!c.dueDate) return true;
      const due = new Date(c.dueDate);
      const endToday = new Date();
      endToday.setHours(23, 59, 59, 999);
      return due <= endToday;
    }
    return true;
  });

  const pendingChores = filteredChores.filter(c => !c.done);
  const householdPoints = Object.values(household.scores || {}).reduce((a, b) => a + b, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Widget Registry
  const WIDGET_REGISTRY: Record<string, React.ReactNode> = {
    hero: <HeroWidget
      household={household}
      todayStr={todayStr}
    />,
    agenda: <AgendaWidget nextEvents={nextEvents} />,
    agenda_today: <AgendaTodayWidget events={events} />,
    meals: <MealWidget todaysMenu={todaysMenu} capitalizedDay={capitalizedDay} />,
    meals_next: <MealsNextWidget menu={menu} />,
    chores: <ChoreWidget pendingChores={pendingChores} />,
    chores_circle: <ChoresCircleWidget chores={filteredChores} />,
    budget: <BudgetWidget totalExpenses={totalExpenses} />,
    budget_balance: <BudgetBalanceWidget household={household} expenses={expenses} user={user} wishlist={wishlist} />,
    budget_next: <BudgetNextWidget household={household} />,
    budget_savings: <BudgetSavingsWidget household={household} />,
    leaderboard: <LeaderboardWidget household={household} />,
    shopping: <ShoppingWidget menu={menu} sortedShopList={sortedShopList} />,
    quick_actions: <QuickActionsWidget />,
    motto: <MottoWidget household={household} />,
    energy: <EnergyWidget household={household} />,
    ai_chat: <AIChatWidget />,
    ai_humor: <HumorWidget />,
    budget_price_watch: <PriceWatchWidget />,
    projects: <ProjectsWidget />,
    health: <HealthWidget />,
    challenges: <ChallengeWidget />,
    memos: <MemoWidget />,
    polls: <PollWidget />,
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 pb-28 pt-10 sm:pt-4 px-4 sm:px-6 transition-colors duration-500">
      <AnimatePresence>
        {showSettings && <HouseholdSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />}
        {showHomeCustomizer && <HomeSettings isOpen={showHomeCustomizer} onClose={() => setShowHomeCustomizer(false)} />}
      </AnimatePresence>

      <div className="max-w-xl mx-auto">
        {/* Help Modal */}
        <InfoModal
          isOpen={showHelp}
          onClose={() => setShowHelp(false)}
          title="Bienvenue sur LifeSync"
          description="Votre centre de contrôle personnel pour gérer votre foyer efficacement et sereinement."
          accentColor="emerald"
          items={[
            { title: "Dashboard Modulaire", description: "Personnalisez votre accueil : agencez, masquez ou ajoutez des widgets selon vos besoins.", icon: Layout, color: "blue" },
            { title: "Mémos & Sondages", description: "Collez des notes sur votre frigo virtuel ou lancez des votes rapides pour le foyer.", icon: MessageSquare, color: "emerald" },
            { title: "Assistant & Daily Humor", description: "L'IA vous accompagne avec des conseils personnalisés et une touche d'humour quotidienne.", icon: Sparkles, color: "violet" }
          ]}
          tips={[
            "Utilisez l'icône de mise en page (en haut à droite) pour réorganiser vos widgets par glisser-déposer.",
            "Le widget 'Daily Humor' est partagé par tout le foyer et se met à jour chaque matin."
          ]}
        />

        {/* Header Section */}
        <header className="flex justify-between items-center mb-8 pt-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-1"
          >
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="LifeSync Logo" className="w-12 h-12 rounded-full shadow-lg border-2 border-white dark:border-slate-800" />
              <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">LifeSync</h1>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {new Date().getHours() < 12 ? "Bonjour !" :
                new Date().getHours() < 14 ? "Bon appétit !" :
                  new Date().getHours() < 18 ? "Bon après-midi !" :
                    "Bonsoir !"} <span className="animate-bounce">👋</span>
            </p>
          </motion.div>

          <div className="flex gap-2">
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHelp(true)}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-500 transition-all"
            >
              <HelpCircle size={22} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleNotifications}
              className={cn(
                "p-3 rounded-2xl shadow-sm border transition-all",
                notifPermission === 'granted'
                  ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-500"
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-500"
              )}
              title={notifPermission === 'granted' ? "Notifications activées" : "Activer les notifications"}
            >
              {notifPermission === 'granted' ? <Bell size={22} fill="currentColor" fillOpacity={0.2} /> : <BellOff size={22} />}
            </motion.button>
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowHomeCustomizer(true)}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-500 transition-all"
            >
              <Layout size={22} />
            </motion.button>
            <motion.button
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-500 transition-all"
            >
              <Settings size={22} />
            </motion.button>
          </div>
        </header>



        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-5"
        >
          {userWidgets.map((widgetId: string) => (
            <div key={widgetId}>
              {WIDGET_REGISTRY[widgetId]}
            </div>
          ))}

          {userWidgets.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-300">
                <Layout size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Aucun widget sélectionné</p>
              <button
                onClick={() => setShowHomeCustomizer(true)}
                className="mt-4 text-emerald-500 text-xs font-black uppercase tracking-widest"
              >
                Personnaliser
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

