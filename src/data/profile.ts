export type Link = { label: string; href: string };
export type Stat = { label: string; value: string; hint?: string };
export type Skill = { title: string; desc: string; tags: string[], featured?: boolean };
export type Skill_2nd = { title: string; desc: string; tags: string[], featured?: boolean };
export type Showcase = { title: string; desc: string; img: string; tags: string[]; href?: string };

export const profile = {
  handle: "playSURE",
  displayName: "",
  tagline: "",

  cover: "/assets/cover-cs2.png",
  avatar: "/assets/Image_Profil.png",

  ctas: [
    { label: "CoachingMaster", href: "https://coachingmaster.fr/coach_profile.php?coach_id=122" },
  ] as Link[],

  
  links: [
    { label: "YouTube", href: "https://www.youtube.com/@playSUR3" },
    { label: "Discord", href: "https://discord.gg/DjxqXj67HU" },
    { label: "TikTok", href: "https://www.tiktok.com/@playsur3" },
    { label: "Instagram", href: "https://www.instagram.com/play.sur3/" },
    { label: "Facebook", href: "https://www.facebook.com/people/Playsure/61585334156709/" },
  ] as Link[],

  about:
    "Remplissez vos résultats au quotidien afin de voir votre évolution",

  stats: [
    { label: "Format", value: "Session Discord (1h)", hint: "VOD review + plan d’action" },
    { label: "Focus", value: "Teamplay & décision", hint: "execs • mid-round • retakes" },
    { label: "Méthode", value: "A.R.C.", hint: "analyse → corrections → routine" },
    { label: "Bonus", value: "Suivi & ressources", hint: "docs • routines • objectifs" },
  ] as Stat[],

  skills: [
    {
      title: "Coaching CS2",
      desc: "Analyse VOD, rôles, comms, exécutions simples, routines d'entraînement.",
      tags: ["Solo", "Team", "ARC", "Review", "Roadmap"],
      featured: true,
    },
 ] as Skill[],

   skills_2nd: [
    {
      title: "Moviemaking",
      desc: "Fragmovies, one-action, motion design, titrage 3D, sound design.",
      tags: ["S2FM", "HLAE", "After Effects", "Premiere", "1080p@60fps"],
    },
    {
      title: "Création de maps",
      desc: "Création / prototypage de maps, routes de cam, overviews & visuels stratégiques.",
      tags: ["Gold SRC", "Source 2", "Hammer"],
    },
    {
      title: "Data & Dashboards",
      desc: "Stats CS2, dashboards, insights sur perfs (maps, rôles, trends).",
      tags: ["Power BI", "CSV"],
    },
  ] as Skill_2nd[],


  showcases: [
    {
      title: "LAN sur CS:GO",
      desc: "De nuit, l'ambiance s'intensifie ! Prêt à dormir sous les tables ?",      
      img: "/assets/LAN/AWARE 1.png",
      tags: ["LAN", "Team", "Chill"],
    },
    {
      title: "LAN sur CS:GO",
      desc: "Expérience LAN entre potes après notre âge d'or, mais peut importe le niveau ! Faites en !",
      img: "/assets/LAN/AWARE 2.png",
      tags: ["LAN", "Team", "Chill"],
    },
    {
      title: "Pour découvrir entièrement l'ambiance, le lien est au-dessous !",
      desc: "Merci à Vakarm.net pour leurs photos",
      img: "/assets/LAN/Nantarena.png",
      tags: ["Cover", "French Touch", "RIP"],
    },
  ] as Showcase[],

    // video skillCard
    heroVideos: [
      "/assets/video-intro_v2.mp4",
],


};
