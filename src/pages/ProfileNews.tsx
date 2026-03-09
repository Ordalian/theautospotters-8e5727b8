import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";
import { ArrowLeft, Newspaper, Shield, MessageSquare, Navigation, Lock, Eye, Package, LayoutGrid, Sparkles, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { markPatchNotesRead } from "@/lib/patchNotes";

interface PatchEntry {
  icon: React.ElementType;
  title: string;
  details: string[];
  tag: "security" | "feature" | "fix";
}

const tagColors: Record<string, string> = {
  security: "bg-destructive/15 text-destructive",
  feature: "bg-primary/15 text-primary",
  fix: "bg-amber-500/15 text-amber-500",
};

const tagLabels: Record<string, Record<string, string>> = {
  fr: { security: "Sécurité", feature: "Nouveauté", fix: "Correctif" },
  en: { security: "Security", feature: "Feature", fix: "Fix" },
};

const ProfileNews = () => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const lang = language === "fr" ? "fr" : "en";

  useEffect(() => { markPatchNotesRead(); }, []);

  const patchesV02: PatchEntry[] = lang === "fr" ? [
    {
      icon: Sparkles,
      title: "Conservation des cartes",
      details: [
        "Chaque carte a maintenant une condition (Abîmée, Moyenne, Bon état, Parfaite) avec un tirage aléatoire à l'ouverture.",
        "Les stats sont modulées par la condition (×0,7 à ×1,15). Overlay visuel et badge sur chaque carte.",
        "La condition est sauvegardée en base et affichée dans ta collection (meilleure condition par carte).",
      ],
      tag: "feature",
    },
    {
      icon: LayoutGrid,
      title: "Rééquilibrage des 200 cartes",
      details: [
        "Matrice d'archétypes : une stat forte, une secondaire, deux faibles par type (Speed, Résistance, Adaptabilité, Puissance).",
        "Totaux identiques par rareté (14 / 20 / 27 / 34) avec variance ±1 pour différencier les cartes.",
        "Une carte Parfaite de rareté inférieure peut rivaliser avec une Abîmée de rareté supérieure.",
      ],
      tag: "feature",
    },
    {
      icon: LayoutGrid,
      title: "Accueil en 3 tuiles",
      details: [
        "Nouvelle page d'accueil après connexion : Boosters, Mes cartes, Cartes d'amis.",
        "Tuiles avec style amber/or, badges (NOUVEAU, X MYTHIC, etc.) et compteurs en temps réel.",
        "Page « Cartes d'amis » : liste des amis avec leurs 3 dernières cartes en aperçu.",
      ],
      tag: "feature",
    },
    {
      icon: Package,
      title: "Ouverture de booster façon Pokémon",
      details: [
        "Flow en 6 phases : choix du pack → anticipation (shake + lueur) → déchirure (flash + particules) → révélation carte par carte.",
        "Tap sur le dos pour retourner, effets par rareté (lueur verte/violette/ambre, particules, overlay Mythic).",
        "Récap des 5 cartes puis retour au menu. Les cartes sont enregistrées en base à la fin du flow.",
      ],
      tag: "feature",
    },
    {
      icon: Trophy,
      title: "XP et base de données",
      details: [
        "+20 XP quand tu lies un spot et sa miniature (incrément atomique via RPC).",
        "Nouvelle colonne condition sur user_game_cards ; fonction increment_total_xp pour éviter les race conditions.",
      ],
      tag: "feature",
    },
  ] : [
    {
      icon: Sparkles,
      title: "Card condition system",
      details: [
        "Each card now has a condition (Damaged, Average, Good, Perfect) rolled at pack opening.",
        "Stats are scaled by condition (×0.7 to ×1.15). Visual overlay and badge on every card.",
        "Condition is saved in the database and shown in your collection (best condition per card).",
      ],
      tag: "feature",
    },
    {
      icon: LayoutGrid,
      title: "Rebalanced 200 cards",
      details: [
        "Archetype matrix: one strong stat, one secondary, two weak per type (Speed, Resilience, Adaptability, Power).",
        "Same totals per rarity (14 / 20 / 27 / 34) with ±1 variance to differentiate cards.",
        "A Perfect lower-rarity card can compete with a Damaged higher-rarity one.",
      ],
      tag: "feature",
    },
    {
      icon: LayoutGrid,
      title: "Home screen with 3 tiles",
      details: [
        "New landing after login: Boosters, My cards, Friends' cards.",
        "Tiles with amber/gold style, badges (NEW, X MYTHIC, etc.) and live counters.",
        "« Friends' cards » page: list of friends with their 3 latest cards preview.",
      ],
      tag: "feature",
    },
    {
      icon: Package,
      title: "Pokémon-style booster opening",
      details: [
        "6-phase flow: pick pack → anticipation (shake + glow) → tear (flash + particles) → reveal cards one by one.",
        "Tap card back to flip; rarity effects (green/violet/amber glow, particles, Mythic overlay).",
        "Summary of 5 cards then back to menu. Cards are saved to the database at the end of the flow.",
      ],
      tag: "feature",
    },
    {
      icon: Trophy,
      title: "XP and database",
      details: [
        "+20 XP when you link a spot and its miniature (atomic increment via RPC).",
        "New condition column on user_game_cards; increment_total_xp function to avoid race conditions.",
      ],
      tag: "feature",
    },
  ];

  const patches: PatchEntry[] = lang === "fr" ? [
    {
      icon: Shield,
      title: "Durcissement des politiques de sécurité (RLS)",
      details: [
        "Refonte complète des politiques d'accès aux données (Row-Level Security) sur toutes les tables.",
        "Les likes, photos, groupes de garage et messages sont désormais strictement limités à leur propriétaire.",
        "Les amitiés ne peuvent plus être manipulées côté client — acceptation via fonction sécurisée uniquement.",
      ],
      tag: "security",
    },
    {
      icon: Lock,
      title: "Protection contre l'escalade de privilèges",
      details: [
        "Remplacement des UPDATE directs sur les amitiés par une fonction SECURITY DEFINER.",
        "Sécurisation du search_path sur 7 fonctions internes pour prévenir les injections.",
        "Seul le destinataire d'une demande d'ami peut l'accepter ou la refuser.",
      ],
      tag: "security",
    },
    {
      icon: Eye,
      title: "Vue publique des profils",
      details: [
        "Création d'une vue profiles_public exposant uniquement les infos nécessaires (pseudo, avatar, XP, emblèmes).",
        "Les paramètres privés (notifications, langue, thème) ne sont plus visibles par les autres joueurs.",
      ],
      tag: "security",
    },
    {
      icon: MessageSquare,
      title: "Correction de la messagerie",
      details: [
        "Correction d'un crash React (hooks appelés dans le mauvais ordre) empêchant l'affichage de la messagerie.",
        "La messagerie est à nouveau pleinement fonctionnelle.",
      ],
      tag: "fix",
    },
    {
      icon: Navigation,
      title: "Navigation améliorée Dashboard ↔ Messagerie",
      details: [
        "Nouveau header dans la messagerie : bouton « Accueil » animé à gauche, titre à droite.",
        "Swipe vers la droite dans la messagerie pour revenir au Dashboard.",
        "Le bouton « Messagerie » du Dashboard redirige correctement vers la page de messagerie.",
      ],
      tag: "feature",
    },
  ] : [
    {
      icon: Shield,
      title: "Security policy hardening (RLS)",
      details: [
        "Complete overhaul of Row-Level Security policies on all tables.",
        "Likes, photos, garage groups, and messages are now strictly limited to their owner.",
        "Friendships can no longer be manipulated client-side — acceptance via secure function only.",
      ],
      tag: "security",
    },
    {
      icon: Lock,
      title: "Privilege escalation protection",
      details: [
        "Replaced direct UPDATEs on friendships with a SECURITY DEFINER function.",
        "Secured search_path on 7 internal functions to prevent injection attacks.",
        "Only the addressee of a friend request can accept or decline it.",
      ],
      tag: "security",
    },
    {
      icon: Eye,
      title: "Public profile view",
      details: [
        "Created a profiles_public view exposing only necessary info (username, avatar, XP, emblems).",
        "Private settings (notifications, language, theme) are no longer visible to other players.",
      ],
      tag: "security",
    },
    {
      icon: MessageSquare,
      title: "Messaging fix",
      details: [
        "Fixed a React crash (hooks called in wrong order) preventing messaging from displaying.",
        "Messaging is fully functional again.",
      ],
      tag: "fix",
    },
    {
      icon: Navigation,
      title: "Improved Dashboard ↔ Messaging navigation",
      details: [
        "New messaging header: animated « Home » button on the left, title on the right.",
        "Swipe right in messaging to return to the Dashboard.",
        "The « Messaging » button on the Dashboard now correctly redirects to the messaging page.",
      ],
      tag: "feature",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-4 border-b border-border/50">
        <Button variant="ghost" size="icon" onClick={() => navigate("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">{t.profile_tile_news as string}</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5">
        {/* Patch v0.2 */}
        <div className="flex items-center gap-3 pt-2">
          <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Patch Note v0.2</h2>
            <p className="text-xs text-muted-foreground">24 {lang === "fr" ? "février" : "February"} 2026</p>
          </div>
        </div>
        <div className="space-y-3">
          {patchesV02.map((entry, i) => (
            <Card key={`v02-${i}`} className="border-border/50 bg-card/80 overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                    <entry.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm leading-tight">{entry.title}</h3>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${tagColors[entry.tag]}`}>
                        {tagLabels[lang][entry.tag]}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {entry.details.map((d, j) => (
                        <li key={j} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-primary/60 mt-1 shrink-0">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Patch v0.1 */}
        <div className="flex items-center gap-3 pt-6">
          <div className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-muted-foreground">Patch Note v0.1</h2>
            <p className="text-xs text-muted-foreground">8 {lang === "fr" ? "mars" : "March"} 2026</p>
          </div>
        </div>
        <div className="space-y-3">
          {patches.map((entry, i) => (
            <Card key={`v01-${i}`} className="border-border/50 bg-card/80 overflow-hidden">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0 mt-0.5">
                    <entry.icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm leading-tight">{entry.title}</h3>
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${tagColors[entry.tag]}`}>
                        {tagLabels[lang][entry.tag]}
                      </span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {entry.details.map((d, j) => (
                        <li key={j} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                          <span className="text-primary/60 mt-1 shrink-0">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileNews;
