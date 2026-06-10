import { useState, useRef, useEffect } from "react";
import {
  Github, Rocket, Image, Video, Terminal, GitBranch, GitCommit,
  Heart, MessageSquare, Share2, Bookmark, Search, Bell, Plus,
  Code2, Zap, Users, TrendingUp, X, Send, Globe, Lock, Mail,
  ArrowLeft, Check, CheckCheck, Paperclip, Smile, ChevronLeft,
  Briefcase, Building2, Database, Shield, PenTool, BarChart2,
  UserCheck, GraduationCap, Eye, EyeOff,
  Settings, ChevronRight, Moon, Sun, Smartphone, LogOut,
  Camera, AtSign, FileText, Key, Fingerprint, Trash2,
  Volume2, VolumeX, MessageCircle, Star, Info, HelpCircle,
} from "lucide-react";

// ─── Onboarding Data ─────────────────────────────────────────────────────────
const ROLES = [
  { id: "developer", label: "Developer",     icon: Code2,         color: "#6366f1", desc: "Kod yazır, layihə qurur" },
  { id: "designer",  label: "Designer",      icon: PenTool,       color: "#ec4899", desc: "UI/UX, qrafik dizayn" },
  { id: "devops",    label: "DevOps / SRE",  icon: Shield,        color: "#10b981", desc: "İnfrastruktur, CI/CD, cloud" },
  { id: "hr",        label: "HR / Recruiter",icon: Briefcase,     color: "#f59e0b", desc: "İstedad axtarır, team qurur" },
  { id: "manager",   label: "Product Manager",icon: BarChart2,    color: "#3b82f6", desc: "Məhsulu idarə edir" },
  { id: "student",   label: "Tələbə",        icon: GraduationCap, color: "#8b5cf6", desc: "Öyrənir, inkişaf edir" },
  { id: "founder",   label: "Founder / CTO", icon: Building2,     color: "#ef4444", desc: "Şirkət qurur, komanda idarə edir" },
  { id: "data",      label: "Data / ML Eng.", icon: Database,     color: "#06b6d4", desc: "Data analiz, ML modellər" },
];

const SUB_ROLES = {
  developer: [
    { id: "frontend",  label: "Frontend",      icon: "🖥️", desc: "React, Vue, Angular..." },
    { id: "backend",   label: "Backend",        icon: "⚙️", desc: "Node.js, Go, Python, Java..." },
    { id: "fullstack", label: "Full Stack",     icon: "🔄", desc: "Hər iki tərəf" },
    { id: "mobile",    label: "Mobile",         icon: "📱", desc: "React Native, Flutter, Swift..." },
    { id: "embedded",  label: "Embedded / IoT", icon: "🔌", desc: "C/C++, Arduino, donanım..." },
    { id: "game",      label: "Game Dev",       icon: "🎮", desc: "Unity, Unreal, Godot..." },
  ],
  designer: [
    { id: "ux",      label: "UX Designer",      icon: "🔬", desc: "İstifadəçi araşdırması" },
    { id: "ui",      label: "UI Designer",      icon: "🎨", desc: "Vizual dizayn, komponent" },
    { id: "product", label: "Product Designer", icon: "✏️", desc: "Hər iki rol birlikdə" },
    { id: "motion",  label: "Motion Designer",  icon: "🎬", desc: "Animasiya, video" },
    { id: "brand",   label: "Brand Designer",   icon: "💎", desc: "Logo, korporativ stil" },
  ],
  devops: [
    { id: "cloud",    label: "Cloud Engineer",    icon: "☁️", desc: "AWS, GCP, Azure" },
    { id: "sre",      label: "SRE",               icon: "📊", desc: "Etibarlılıq, monitorinq" },
    { id: "security", label: "Security Eng.",     icon: "🔐", desc: "Kibertəhlükəsizlik" },
    { id: "cicd",     label: "CI/CD Specialist",  icon: "🔁", desc: "Pipeline, avtomatlaşdırma" },
  ],
  data: [
    { id: "analyst",   label: "Data Analyst",   icon: "📈", desc: "SQL, Excel, Tableau" },
    { id: "engineer",  label: "Data Engineer",  icon: "🏗️", desc: "Pipeline, ETL, warehouse" },
    { id: "scientist", label: "Data Scientist", icon: "🧪", desc: "ML, statistika, model" },
    { id: "ml",        label: "ML Engineer",    icon: "🤖", desc: "Model qurma, deploy" },
  ],
  hr: [
    { id: "recruiter", label: "Recruiter",           icon: "🎯", desc: "İstedad axtarır" },
    { id: "hrbp",      label: "HR Business Partner", icon: "🤝", desc: "Komanda mədəniyyəti" },
    { id: "talent",    label: "Talent Manager",      icon: "⭐", desc: "İnkişaf proqramları" },
  ],
  manager: [
    { id: "pm",       label: "Product Manager",      icon: "📋", desc: "Roadmap, prioritet" },
    { id: "scrum",    label: "Scrum Master",          icon: "🔄", desc: "Agile, sprint" },
    { id: "director", label: "Engineering Director",  icon: "🏢", desc: "Texniki liderlik" },
  ],
  student: [
    { id: "cs",          label: "Kompüter Elmləri", icon: "💻", desc: "Universitetdə oxuyur" },
    { id: "bootcamp",    label: "Bootcamp",          icon: "🚀", desc: "Intensiv kurs" },
    { id: "selftaught",  label: "Self-taught",       icon: "📚", desc: "Özbaşına öyrənir" },
  ],
  founder: [
    { id: "cto",   label: "CTO",          icon: "⚡", desc: "Texniki direktor" },
    { id: "ceo",   label: "CEO/Co-founder",icon: "🏆", desc: "Şirkəti idarə edir" },
    { id: "indie", label: "Indie Hacker", icon: "🛠️", desc: "Solo məhsul qurur" },
  ],
};

const TECH_STACKS = {
  frontend:  ["React", "Vue", "Angular", "Next.js", "TypeScript", "Tailwind", "Svelte"],
  backend:   ["Node.js", "Python", "Go", "Java", "Rust", "PHP", "Ruby", "C#"],
  fullstack: ["React + Node", "Next.js", "Nuxt", "Django", "Laravel", "Rails"],
  mobile:    ["React Native", "Flutter", "Swift", "Kotlin", "Expo", "Ionic"],
  devops:    ["Docker", "Kubernetes", "AWS", "GCP", "Azure", "Terraform", "Jenkins"],
  data:      ["Python", "SQL", "Spark", "Airflow", "TensorFlow", "PyTorch", "dbt"],
  default:   ["Git", "Figma", "Jira", "Slack", "Notion", "Linear"],
};

// ─── Mock Data ────────────────────────────────────────────────────────────────
const USERS = {
  u1: { id: "u1", name: "Dastan Məmmədov", role: "Full-Stack Dev", avatar: "DM", color: "#6366f1" },
  u2: { id: "u2", name: "Leyla Hüseynova",  role: "DevOps Engineer", avatar: "LH", color: "#ec4899" },
  u3: { id: "u3", name: "Kamran Əliyev",    role: "Mobile Dev",      avatar: "KƏ", color: "#10b981" },
  u4: { id: "u4", name: "Nigar Babayeva",   role: "HR Manager",      avatar: "NB", color: "#f59e0b" },
};

const INITIAL_POSTS = [
  {
    id: "p1", userId: "u1", type: "git", time: "2 saat əvvəl",
    repo: "xestexana/mobile-app", branch: "feat/appointment-booking",
    commits: [
      { hash: "a3f9c2b", msg: "Fix: birthDate field validation in RegisterScreen" },
      { hash: "d87e1a4", msg: "Add: i18n support for az/en/ru locales" },
      { hash: "c21b0ff", msg: "Refactor: API client with axios interceptors" },
    ],
    stats: { additions: 342, deletions: 87, files: 12 },
    likes: 24, comments: 6, liked: false, bookmarked: false,
    caption: "Xəstəxana mobil tətbiqi üçün böyük update! Appointment booking flow tam bitdi 🚀",
    commentsList: [
      { id: "cm1", userId: "u2", text: "Çox yaxşı iş! PR-ı review etdim, lgtm 🔥", time: "1 saat əvvəl", liked: false, likes: 3 },
      { id: "cm2", userId: "u3", text: "i18n support əlavə etmisən, süper! Hansı lib istifadə etdin?", time: "2 saat əvvəl", liked: false, likes: 1 },
    ],
  },
  {
    id: "p2", userId: "u2", type: "deploy", time: "5 saat əvvəl",
    service: "Kubernetes", env: "Production", status: "success", duration: "3m 42s",
    likes: 41, comments: 12, liked: true, bookmarked: false,
    caption: "Production deploy uğurlu oldu! Zero-downtime rolling update 🎯",
    tags: ["#kubernetes", "#devops", "#cicd"],
    commentsList: [
      { id: "cm3", userId: "u1", text: "Rolling update strategy nə vaxtdan? Canary da istifadə edirsən?", time: "3 saat əvvəl", liked: false, likes: 5 },
      { id: "cm4", userId: "u4", text: "Biz də k8s keçmək istəyirik, hansı cloud provayderi?", time: "4 saat əvvəl", liked: true, likes: 2 },
    ],
  },
  {
    id: "p3", userId: "u3", type: "media", time: "1 gün əvvəl", mediaType: "video",
    caption: "Yeni React Native animasiya kütüphanəsi ilə hazırladığım onboarding flow. Reanimated 3 ilə çox smooth oldu! 💫",
    likes: 89, comments: 23, liked: false, bookmarked: true,
    tags: ["#reactnative", "#animation", "#mobile"],
    commentsList: [
      { id: "cm5", userId: "u1", text: "Reanimated 3 ilə shared element transition işlədir?", time: "20 saat əvvəl", liked: false, likes: 7 },
      { id: "cm6", userId: "u2", text: "Bu animasiyalar çox smooth görünür! 🔥", time: "22 saat əvvəl", liked: false, likes: 4 },
    ],
  },
  {
    id: "p4", userId: "u4", type: "job", time: "3 gün əvvəl",
    caption: "🔥 Şirkətimizə Senior Backend Developer axtarırıq! Node.js + PostgreSQL + Docker bilgisi tələb olunur.",
    requirements: ["3+ il təcrübə", "Node.js / TypeScript", "PostgreSQL", "Docker / K8s"],
    likes: 56, comments: 31, liked: false, bookmarked: false,
    commentsList: [
      { id: "cm7", userId: "u1", text: "Remote imkan var mı?", time: "2 gün əvvəl", liked: false, likes: 12 },
      { id: "cm8", userId: "u3", text: "Maaş aralığı hansı? DM edə bilərəm?", time: "3 gün əvvəl", liked: false, likes: 6 },
    ],
  },
];

const INITIAL_CONVERSATIONS = [
  {
    id: "c1", userId: "u2", lastMsg: "Yaxşı, PR-ı review edirəm 👀", time: "11:42", unread: 2,
    messages: [
      { id: "m1", from: "u2", text: "Salam! Xəstəxana repo-nu gördüm, çox yaxşı işdir 🔥", time: "11:30", read: true },
      { id: "m2", from: "u1", text: "Sağ ol! Deploy pipeline-ını da bitirmişəm artıq", time: "11:35", read: true },
      { id: "m3", from: "u2", text: "k8s istifadə edirsən?", time: "11:38", read: true },
      { id: "m4", from: "u1", text: "Hə, rolling update ilə. PR açmışam, baxarsan?", time: "11:40", read: true },
      { id: "m5", from: "u2", text: "Yaxşı, PR-ı review edirəm 👀", time: "11:42", read: false },
    ],
  },
  {
    id: "c2", userId: "u3", lastMsg: "Reanimated 3 üçün tutorial var, göndərim?", time: "Dünən", unread: 0,
    messages: [
      { id: "m1", from: "u3", text: "Salam! React Native animasiyanda problem var?", time: "Dünən 14:00", read: true },
      { id: "m2", from: "u1", text: "Hə, shared element transition işləmir", time: "Dünən 14:05", read: true },
      { id: "m3", from: "u3", text: "Reanimated 3 üçün tutorial var, göndərim?", time: "Dünən 14:10", read: true },
    ],
  },
  {
    id: "c3", userId: "u4", lastMsg: "Senior Backend pozisiyası üçün maraqlıdırmı?", time: "Bazar", unread: 1,
    messages: [
      { id: "m1", from: "u4", text: "Salam! Şirkətimizdən HR-yam.", time: "Bazar 10:00", read: true },
      { id: "m2", from: "u4", text: "Senior Backend pozisiyası üçün maraqlıdırmı?", time: "Bazar 10:02", read: false },
    ],
  },
];

const TRENDING = [
  { tag: "#reactnative", posts: "2.4k" },
  { tag: "#golang",      posts: "1.8k" },
  { tag: "#kubernetes",  posts: "3.1k" },
  { tag: "#ai",          posts: "9.2k" },
];

const INITIAL_NOTIFICATIONS = [
  { id: "n1", type: "like",    userId: "u2", postId: "p1", text: "postunu bəyəndi",        time: "5 dəq əvvəl",  read: false },
  { id: "n2", type: "comment", userId: "u3", postId: "p1", text: "şərh yazdı: \"Çox yaxşı!\"", time: "12 dəq əvvəl", read: false },
  { id: "n3", type: "follow",  userId: "u4", postId: null, text: "sizi izləməyə başladı",   time: "1 saat əvvəl", read: false },
  { id: "n4", type: "like",    userId: "u3", postId: "p2", text: "postunu bəyəndi",          time: "3 saat əvvəl", read: true  },
  { id: "n5", type: "comment", userId: "u4", postId: "p3", text: "şərh yazdı: \"Remote var mı?\"", time: "5 saat əvvəl", read: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Avatar({ user, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: user.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: size * 0.33, fontWeight: 700, flexShrink: 0 }}>
      {user.avatar}
    </div>
  );
}

// ─── Post sub-cards ───────────────────────────────────────────────────────────
function GitCard({ post }) {
  return (
    <div style={{ background: "#0d1117", borderRadius: 10, padding: 14, marginTop: 10, border: "1px solid #21262d" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Github size={16} color="#58a6ff" />
        <span style={{ color: "#58a6ff", fontSize: 13, fontWeight: 600 }}>{post.repo}</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
          <GitBranch size={12} color="#8b949e" />
          <span style={{ color: "#8b949e", fontSize: 11 }}>{post.branch}</span>
        </div>
      </div>
      {post.commits.map((c) => (
        <div key={c.hash} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderBottom: "1px solid #21262d" }}>
          <GitCommit size={13} color="#3fb950" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <code style={{ color: "#8b949e", fontSize: 10 }}>{c.hash}</code>
            <p style={{ color: "#e6edf3", fontSize: 12, margin: "2px 0 0" }}>{c.msg}</p>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
        <span style={{ color: "#3fb950", fontSize: 11 }}>+{post.stats.additions}</span>
        <span style={{ color: "#f85149", fontSize: 11 }}>−{post.stats.deletions}</span>
        <span style={{ color: "#8b949e", fontSize: 11 }}>{post.stats.files} fayl</span>
      </div>
    </div>
  );
}

function DeployCard({ post }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#0f2027,#1a2a1a)", borderRadius: 10, padding: 14, marginTop: 10, border: "1px solid #1f3a1f" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Rocket size={18} color="#3fb950" />
        <div>
          <p style={{ color: "#e6edf3", fontSize: 13, fontWeight: 600, margin: 0 }}>{post.service} → {post.env}</p>
          <p style={{ color: "#3fb950", fontSize: 11, margin: "3px 0 0" }}>✓ Deploy uğurlu · {post.duration}</p>
        </div>
        <div style={{ marginLeft: "auto", background: "#1a3a1a", border: "1px solid #3fb950", borderRadius: 20, padding: "3px 10px" }}>
          <span style={{ color: "#3fb950", fontSize: 11, fontWeight: 600 }}>LIVE</span>
        </div>
      </div>
    </div>
  );
}

function MediaCard() {
  return (
    <div style={{ background: "linear-gradient(135deg,#1a1033,#0d1117)", borderRadius: 10, marginTop: 10, height: 180, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #30215a" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 28, background: "rgba(99,102,241,0.2)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px", border: "1px solid rgba(99,102,241,0.4)" }}>
          <Video size={22} color="#818cf8" />
        </div>
        <p style={{ color: "#818cf8", fontSize: 12, margin: 0 }}>Onboarding Flow Demo</p>
        <p style={{ color: "#4b5563", fontSize: 10, margin: "4px 0 0" }}>React Native · Reanimated 3</p>
      </div>
    </div>
  );
}

function JobCard({ post }) {
  return (
    <div style={{ background: "linear-gradient(135deg,#1c1200,#0d1117)", borderRadius: 10, padding: 14, marginTop: 10, border: "1px solid #3d2a00" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {post.requirements.map((r) => (
          <span key={r} style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, padding: "2px 8px", color: "#fbbf24", fontSize: 11 }}>{r}</span>
        ))}
      </div>
      <button style={{ marginTop: 12, width: "100%", padding: "8px", background: "#f59e0b", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
        Müraciət et →
      </button>
    </div>
  );
}

function PostCard({ post, onLike, onBookmark, onComment }) {
  const user = USERS[post.userId];
  const [likeAnim, setLikeAnim] = useState(false);

  const handleLike = () => {
    onLike(post.id);
    if (!post.liked) {
      setLikeAnim(true);
      setTimeout(() => setLikeAnim(false), 600);
    }
  };

  const typeStyle = {
    git:    { bg: "rgba(88,166,255,0.1)",   color: "#58a6ff",  border: "rgba(88,166,255,0.3)",  label: "GIT" },
    deploy: { bg: "rgba(63,185,80,0.1)",    color: "#3fb950",  border: "rgba(63,185,80,0.3)",   label: "DEPLOY" },
    media:  { bg: "rgba(99,102,241,0.1)",   color: "#818cf8",  border: "rgba(99,102,241,0.3)",  label: "MEDIA" },
    job:    { bg: "rgba(245,158,11,0.1)",   color: "#fbbf24",  border: "rgba(245,158,11,0.3)",  label: "İŞ ELANI" },
  }[post.type];

  return (
    <div style={{ background: "#161b22", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #21262d" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar user={user} />
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontSize: 14, fontWeight: 600, margin: 0 }}>{user.name}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <span style={{ color: "#8b949e", fontSize: 11 }}>{user.role}</span>
            <span style={{ color: "#30363d" }}>·</span>
            <span style={{ color: "#8b949e", fontSize: 11 }}>{post.time}</span>
          </div>
        </div>
        <div style={{ padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: typeStyle.bg, color: typeStyle.color, border: `1px solid ${typeStyle.border}` }}>
          {typeStyle.label}
        </div>
      </div>

      <p style={{ color: "#c9d1d9", fontSize: 13, lineHeight: 1.6, marginTop: 12 }}>{post.caption}</p>
      {post.tags && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
          {post.tags.map((t) => <span key={t} style={{ color: "#58a6ff", fontSize: 12 }}>{t}</span>)}
        </div>
      )}

      {post.type === "git"    && <GitCard post={post} />}
      {post.type === "deploy" && <DeployCard post={post} />}
      {post.type === "media"  && <MediaCard />}
      {post.type === "job"    && <JobCard post={post} />}

      <div style={{ display: "flex", alignItems: "center", marginTop: 14, gap: 4 }}>
        <button onClick={handleLike} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, color: post.liked ? "#f85149" : "#8b949e", transition: "transform 0.1s", transform: likeAnim ? "scale(1.35)" : "scale(1)" }}>
          <Heart size={16} fill={post.liked ? "#f85149" : "none"} color={post.liked ? "#f85149" : "#8b949e"} style={{ transition: "all 0.2s" }} />
          <span style={{ fontSize: 12 }}>{post.liked ? post.likes + 1 : post.likes}</span>
        </button>
        <button onClick={() => onComment && onComment(post)} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, color: "#8b949e" }}>
          <MessageSquare size={16} /><span style={{ fontSize: 12 }}>{(post.commentsList?.length ?? post.comments)}</span>
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, color: "#8b949e" }}>
          <Share2 size={16} />
        </button>
        <button onClick={() => onBookmark(post.id)} style={{ marginLeft: "auto", display: "flex", alignItems: "center", background: "none", border: "none", cursor: "pointer", padding: "6px 10px", borderRadius: 8, color: post.bookmarked ? "#f59e0b" : "#8b949e" }}>
          <Bookmark size={16} fill={post.bookmarked ? "#f59e0b" : "none"} />
        </button>
      </div>
    </div>
  );
}

// ─── Comments Modal ───────────────────────────────────────────────────────────
function CommentsModal({ post, onClose, onAddComment, onLikeComment }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [post.commentsList]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    onAddComment(post.id, { id: `cm${Date.now()}`, userId: "u1", text: t, time: "İndi", liked: false, likes: 0 });
    setText("");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 150, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#161b22", borderRadius: "20px 20px 0 0", width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid #21262d" }}>
        {/* Header */}
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #21262d", flexShrink: 0 }}>
          <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Şərhlər ({post.commentsList?.length ?? 0})</p>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8b949e" /></button>
        </div>

        {/* Post preview */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #21262d", flexShrink: 0, display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Avatar user={USERS[post.userId]} size={32} />
          <p style={{ color: "#8b949e", fontSize: 12, margin: 0, lineHeight: 1.5, flex: 1 }}>{post.caption}</p>
        </div>

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
          {(post.commentsList || []).map((cm) => {
            const cmUser = USERS[cm.userId];
            return (
              <div key={cm.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <Avatar user={cmUser} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#0d1117", borderRadius: "4px 14px 14px 14px", padding: "10px 12px", border: "1px solid #21262d" }}>
                    <p style={{ color: "#58a6ff", fontSize: 12, fontWeight: 600, margin: "0 0 4px" }}>{cmUser.name}</p>
                    <p style={{ color: "#c9d1d9", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{cm.text}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                    <span style={{ color: "#4b5563", fontSize: 11 }}>{cm.time}</span>
                    <button onClick={() => onLikeComment(post.id, cm.id)} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: cm.liked ? "#f85149" : "#8b949e", padding: 0, fontSize: 11 }}>
                      <Heart size={12} fill={cm.liked ? "#f85149" : "none"} color={cm.liked ? "#f85149" : "#8b949e"} />
                      {cm.likes > 0 && <span>{cm.liked ? cm.likes + 1 : cm.likes}</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: "10px 12px 28px", background: "#0d1117", borderTop: "1px solid #21262d", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <Avatar user={USERS.u1} size={32} />
          <div style={{ flex: 1, background: "#161b22", border: "1px solid #30363d", borderRadius: 22, display: "flex", alignItems: "center", padding: "0 12px" }}>
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Şərh yaz..."
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, padding: "10px 0" }} />
          </div>
          <button onClick={handleSend} style={{ width: 36, height: 36, borderRadius: 18, background: text.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#21262d", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <Send size={15} color={text.trim() ? "#fff" : "#4b5563"} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
function ComposeModal({ onClose, onPost }) {
  const [type, setType]       = useState("text");
  const [caption, setCaption] = useState("");
  // git fields
  const [repo, setRepo]       = useState("");
  const [branch, setBranch]   = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  // deploy fields
  const [service, setService] = useState("Kubernetes");
  const [env, setEnv]         = useState("Production");
  // job fields
  const [reqInput, setReqInput] = useState("");
  const [requirements, setRequirements] = useState([]);
  // tags (media / general)
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags]       = useState([]);

  const types = [
    { id: "text",   icon: <Terminal size={14} />, label: "Post",   color: "#8b949e" },
    { id: "git",    icon: <Github size={14} />,   label: "Git",    color: "#58a6ff" },
    { id: "deploy", icon: <Rocket size={14} />,   label: "Deploy", color: "#3fb950" },
    { id: "media",  icon: <Video size={14} />,    label: "Media",  color: "#818cf8" },
    { id: "job",    icon: <Briefcase size={14} />,label: "İş",     color: "#fbbf24" },
  ];

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (t && !tags.includes("#" + t)) setTags((p) => [...p, "#" + t]);
    setTagInput("");
  };

  const addReq = () => {
    const r = reqInput.trim();
    if (r && !requirements.includes(r)) setRequirements((p) => [...p, r]);
    setReqInput("");
  };

  const canPost = () => {
    if (!caption.trim()) return false;
    if (type === "git" && !repo.trim()) return false;
    if (type === "job" && requirements.length === 0) return false;
    return true;
  };

  const handlePost = () => {
    if (!canPost()) return;
    const base = {
      id: `p${Date.now()}`,
      userId: "u1",
      type: type === "text" ? "media" : type,
      time: "İndi",
      caption: caption.trim(),
      likes: 0, comments: 0,
      liked: false, bookmarked: false,
      commentsList: [],
    };
    let extra = {};
    if (type === "git") {
      extra = {
        repo: repo.trim() || "my-repo",
        branch: branch.trim() || "main",
        commits: commitMsg.trim()
          ? [{ hash: Math.random().toString(16).slice(2, 9), msg: commitMsg.trim() }]
          : [{ hash: "a1b2c3d", msg: "Initial commit" }],
        stats: { additions: 0, deletions: 0, files: 1 },
      };
    } else if (type === "deploy") {
      extra = { service, env, status: "success", duration: "2m 30s" };
    } else if (type === "job") {
      extra = { requirements };
    } else if (tags.length > 0) {
      extra = { tags };
    }
    onPost({ ...base, ...extra });
  };

  const inputStyle = { width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 8, padding: "10px 12px", color: "#e6edf3", fontSize: 13, outline: "none", boxSizing: "border-box" };
  const labelStyle = { color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 5, display: "block" };

  const activeColor = types.find((t) => t.id === type)?.color || "#8b949e";

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#161b22", borderRadius: "18px 18px 0 0", padding: 20, width: "100%", maxHeight: "90vh", overflowY: "auto", border: "1px solid #21262d" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Yeni Paylaşım</p>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8b949e" /></button>
        </div>

        {/* Type tabs */}
        <div style={{ display: "flex", gap: 7, marginBottom: 18, overflowX: "auto", paddingBottom: 2 }}>
          {types.map((t) => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 20, border: type === t.id ? `1.5px solid ${t.color}` : "1px solid #30363d", background: type === t.id ? `${t.color}18` : "transparent", color: type === t.id ? t.color : "#8b949e", cursor: "pointer", fontSize: 12, fontWeight: type === t.id ? 700 : 400 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Caption */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <Avatar user={USERS.u1} size={36} />
          <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3}
            placeholder={
              type === "git"    ? "Commit haqqında nə bildirmək istəyirsən?" :
              type === "deploy" ? "Deploy haqqında qeyd..." :
              type === "media"  ? "Proyektin haqqında danış..." :
              type === "job"    ? "Vakansiya haqqında ətraflı izah..." :
              "Nə düşünürsən?"
            }
            style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: 10, padding: 12, color: "#e6edf3", fontSize: 13, resize: "none", outline: "none" }} />
        </div>

        {/* Git fields */}
        {type === "git" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, background: "#0d1117", borderRadius: 10, padding: 14, border: "1px solid #21262d" }}>
            <div>
              <label style={labelStyle}>REPO ADI *</label>
              <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="məs: username/my-project" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>BRANCH</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="məs: feat/new-feature" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>KOMMİT MESAJI</label>
              <input value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} placeholder="məs: Fix: login validation" style={inputStyle} />
            </div>
          </div>
        )}

        {/* Deploy fields */}
        {type === "deploy" && (
          <div style={{ display: "flex", gap: 10, marginBottom: 14, background: "#0d1117", borderRadius: 10, padding: 14, border: "1px solid #21262d" }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>SERVİS</label>
              <select value={service} onChange={(e) => setService(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {["Kubernetes", "Docker", "AWS ECS", "Vercel", "Railway", "Heroku"].map((s) => (
                  <option key={s} value={s} style={{ background: "#161b22" }}>{s}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>MÜHİT</label>
              <select value={env} onChange={(e) => setEnv(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
                {["Production", "Staging", "Development"].map((e) => (
                  <option key={e} value={e} style={{ background: "#161b22" }}>{e}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Job requirements */}
        {type === "job" && (
          <div style={{ marginBottom: 14, background: "#0d1117", borderRadius: 10, padding: 14, border: "1px solid #21262d" }}>
            <label style={labelStyle}>TƏLƏBLƏR *</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
              {requirements.map((r) => (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 20, padding: "3px 10px" }}>
                  <span style={{ color: "#fbbf24", fontSize: 12 }}>{r}</span>
                  <button onClick={() => setRequirements((p) => p.filter((x) => x !== r))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={11} color="#fbbf24" /></button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={reqInput} onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addReq(); } }}
                placeholder="məs: Node.js, Docker..." style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addReq} style={{ background: "#21262d", border: "none", borderRadius: 8, padding: "0 14px", color: "#8b949e", fontSize: 13, cursor: "pointer" }}>+</button>
            </div>
          </div>
        )}

        {/* Tags (media / text) */}
        {(type === "media" || type === "text") && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {tags.map((t) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(88,166,255,0.1)", border: "1px solid rgba(88,166,255,0.3)", borderRadius: 20, padding: "2px 9px" }}>
                  <span style={{ color: "#58a6ff", fontSize: 12 }}>{t}</span>
                  <button onClick={() => setTags((p) => p.filter((x) => x !== t))} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={10} color="#58a6ff" /></button>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addTag(); } }}
                placeholder="#hashtag əlavə et..."
                style={{ ...inputStyle, flex: 1 }} />
              <button onClick={addTag} style={{ background: "#21262d", border: "none", borderRadius: 8, padding: "0 14px", color: "#8b949e", fontSize: 13, cursor: "pointer" }}>+</button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: "1px solid #21262d", paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Globe size={13} color="#8b949e" />
            <span style={{ color: "#8b949e", fontSize: 11 }}>Hamıya açıq</span>
          </div>
          <button onClick={handlePost} disabled={!canPost()}
            style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, background: canPost() ? activeColor : "#21262d", border: "none", borderRadius: 8, padding: "9px 18px", color: canPost() ? "#fff" : "#4b5563", fontWeight: 700, fontSize: 13, cursor: canPost() ? "pointer" : "default", transition: "background 0.15s" }}>
            <Send size={14} /> Paylaş
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications Screen ─────────────────────────────────────────────────────
function NotificationsScreen({ notifications, onMarkRead, onClose }) {
  const iconMap = { like: <Heart size={16} color="#f85149" fill="#f85149" />, comment: <MessageCircle size={16} color="#6366f1" />, follow: <UserCheck size={16} color="#10b981" /> };
  const bgMap   = { like: "rgba(248,81,73,0.1)", comment: "rgba(99,102,241,0.1)", follow: "rgba(16,185,129,0.1)" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#161b22", borderRadius: "0 0 20px 20px", width: "100%", maxWidth: 420, maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid #21262d", marginTop: 0 }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #21262d", flexShrink: 0 }}>
          <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 17, margin: 0 }}>Bildirişlər</p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {notifications.some(n => !n.read) && (
              <button onClick={onMarkRead} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "5px 10px", color: "#818cf8", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Hamısını oxu</button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8b949e" /></button>
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {notifications.map((n) => {
            const u = USERS[n.userId];
            return (
              <div key={n.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: n.read ? "transparent" : "rgba(99,102,241,0.04)", borderBottom: "1px solid #21262d" }}>
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <Avatar user={u} size={40} />
                  <div style={{ position: "absolute", bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, background: bgMap[n.type], border: "2px solid #161b22", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {iconMap[n.type]}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: "#e6edf3", fontSize: 13, margin: 0, lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700 }}>{u.name}</span> {n.text}
                  </p>
                  <p style={{ color: "#4b5563", fontSize: 11, margin: "3px 0 0" }}>{n.time}</p>
                </div>
                {!n.read && <div style={{ width: 8, height: 8, borderRadius: 4, background: "#6366f1", flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Support Modal ────────────────────────────────────────────────────────────
function SupportModal({ user, onClose }) {
  const [step, setStep] = useState("pick");
  const [selected, setSelected] = useState(3);
  const [custom, setCustom] = useState("");
  const amounts = [1, 3, 5, 10];
  const finalAmount = custom ? (parseInt(custom) || 0) : selected;

  const handleSupport = () => setStep("thanks");

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#161b22", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", border: "1px solid #21262d" }}>
        {step === "pick" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
              <div>
                <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>☕ Dəstək ol</p>
                <p style={{ color: "#8b949e", fontSize: 12, margin: "3px 0 0" }}>{user.name}-ə dəstək göstər</p>
              </div>
              <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8b949e" /></button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#0d1117", borderRadius: 12, padding: 14, marginBottom: 20, border: "1px solid #21262d" }}>
              <Avatar user={user} size={44} />
              <div>
                <p style={{ color: "#e6edf3", fontWeight: 600, fontSize: 14, margin: 0 }}>{user.name}</p>
                <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 0" }}>{user.role}</p>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <p style={{ color: "#f59e0b", fontWeight: 700, fontSize: 13, margin: 0 }}>142 dəstəkçi</p>
                <p style={{ color: "#4b5563", fontSize: 11, margin: 0 }}>bu ay</p>
              </div>
            </div>
            <p style={{ color: "#8b949e", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>MİQDAR SEÇ (₼)</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {amounts.map((a) => (
                <button key={a} onClick={() => { setSelected(a); setCustom(""); }}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: selected === a && !custom ? "1.5px solid #f59e0b" : "1px solid #30363d", background: selected === a && !custom ? "rgba(245,158,11,0.1)" : "#0d1117", color: selected === a && !custom ? "#f59e0b" : "#8b949e", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                  ₼{a}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", background: "#0d1117", border: custom ? "1px solid #f59e0b" : "1px solid #30363d", borderRadius: 10, padding: "10px 14px", marginBottom: 20 }}>
              <span style={{ color: "#8b949e", fontSize: 15, marginRight: 6 }}>₼</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Özün yaz..."
                style={{ background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14, flex: 1 }} />
            </div>
            <button onClick={handleSupport} disabled={finalAmount < 1}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: finalAmount >= 1 ? "linear-gradient(135deg,#f59e0b,#d97706)" : "#21262d", color: finalAmount >= 1 ? "#000" : "#4b5563", fontWeight: 800, fontSize: 15, cursor: finalAmount >= 1 ? "pointer" : "default" }}>
              ☕ ₼{finalAmount} Dəstək göstər
            </button>
            <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 10 }}>buymeacoffee.com vasitəsilə · Təhlükəsiz ödəniş</p>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
            <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 18, margin: 0 }}>Təşəkkür edirik!</p>
            <p style={{ color: "#8b949e", fontSize: 13, margin: "8px 0 24px" }}>₼{finalAmount} dəstəyin üçün {user.name} çox minnətdardır ☕</p>
            <button onClick={onClose} style={{ padding: "12px 32px", borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Bağla</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feed Screen ──────────────────────────────────────────────────────────────
function FeedScreen({ posts, onAddPost, onLike, onBookmark, onAddComment, onLikeComment }) {
  const [showCompose, setShowCompose] = useState(false);
  const [commentPost, setCommentPost] = useState(null);

  // Keep commentPost in sync with latest posts state (so comment count updates live)
  const liveCommentPost = commentPost ? posts.find((p) => p.id === commentPost.id) || commentPost : null;

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
      <div style={{ background: "#161b22", borderRadius: 12, padding: 14, marginBottom: 14, border: "1px solid #21262d" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <TrendingUp size={14} color="#f59e0b" />
          <span style={{ color: "#f59e0b", fontSize: 12, fontWeight: 700 }}>Trend Hashtaglər</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {TRENDING.map((t) => (
            <div key={t.tag} style={{ background: "#0d1117", borderRadius: 20, padding: "4px 12px", border: "1px solid #30363d" }}>
              <span style={{ color: "#58a6ff", fontSize: 12 }}>{t.tag}</span>
              <span style={{ color: "#8b949e", fontSize: 10, marginLeft: 4 }}>{t.posts}</span>
            </div>
          ))}
        </div>
      </div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onLike={onLike} onBookmark={onBookmark}
          onComment={(p) => setCommentPost(p)} />
      ))}
      <button onClick={() => setShowCompose(true)} style={{ position: "fixed", bottom: 80, right: 20, width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 20px rgba(99,102,241,0.5)" }}>
        <Plus size={22} color="#fff" />
      </button>
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onPost={(newPost) => { onAddPost(newPost); setShowCompose(false); }} />}
      {liveCommentPost && (
        <CommentsModal
          post={liveCommentPost}
          onClose={() => setCommentPost(null)}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
        />
      )}
    </div>
  );
}

// ─── Explore Screen ───────────────────────────────────────────────────────────
const EXPLORE_USERS = [
  ...Object.values(USERS),
  { id: "u5", name: "Tural Quliyev",    role: "Frontend Dev",     avatar: "TQ", color: "#3b82f6", stack: ["React", "TypeScript", "Tailwind"] },
  { id: "u6", name: "Aytən Mustafayeva",role: "Data Scientist",    avatar: "AM", color: "#8b5cf6", stack: ["Python", "TensorFlow", "SQL"] },
  { id: "u7", name: "Rauf Nəsirov",     role: "Backend Dev",      avatar: "RN", color: "#10b981", stack: ["Go", "PostgreSQL", "Docker"] },
  { id: "u8", name: "Sevinc Əhmədova",  role: "UX Designer",      avatar: "SƏ", color: "#ec4899", stack: ["Figma", "Notion", "Maze"] },
];

function ExploreScreen() {
  const [query, setQuery]       = useState("");
  const [followed, setFollowed] = useState(new Set());
  const [activeTag, setActiveTag] = useState(null);

  const toggleFollow = (id) => {
    setFollowed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const q = query.toLowerCase().trim();
  const filtered = EXPLORE_USERS.filter((u) => {
    const matchesQuery = !q ||
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.stack || []).some((s) => s.toLowerCase().includes(q));
    const matchesTag = !activeTag ||
      (u.stack || []).some((s) => s.toLowerCase().includes(activeTag.toLowerCase()));
    return matchesQuery && matchesTag;
  });

  const FILTER_TAGS = ["React", "Python", "Go", "Figma", "Docker", "TypeScript"];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 80px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
        <Search size={16} color="#8b949e" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ad, rol, texnologiya axtar..."
          style={{ background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, flex: 1 }} />
        {query && (
          <button onClick={() => setQuery("")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}>
            <X size={14} color="#8b949e" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div style={{ display: "flex", gap: 7, flexWrap: "nowrap", overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
        {FILTER_TAGS.map((tag) => (
          <button key={tag} onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 20, border: activeTag === tag ? "1.5px solid #6366f1" : "1px solid #30363d", background: activeTag === tag ? "rgba(99,102,241,0.15)" : "#161b22", color: activeTag === tag ? "#818cf8" : "#8b949e", fontSize: 12, fontWeight: activeTag === tag ? 700 : 400, cursor: "pointer" }}>
            {tag}
          </button>
        ))}
      </div>

      {/* Heading */}
      <p style={{ color: "#8b949e", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
        {q || activeTag ? `${filtered.length} NƏTICƏ` : "TÖVSIYƏ OLUNAN DEVELOPERlər"}
      </p>

      {/* Results */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🔍</p>
          <p style={{ color: "#8b949e", fontSize: 14 }}>Nəticə tapılmadı</p>
          <p style={{ color: "#4b5563", fontSize: 12, marginTop: 4 }}>Başqa açar söz cəhd et</p>
        </div>
      ) : (
        filtered.map((u) => {
          const isFollowed = followed.has(u.id);
          return (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#161b22", borderRadius: 12, padding: 14, marginBottom: 10, border: "1px solid #21262d" }}>
              <Avatar user={u} size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: "#e6edf3", fontWeight: 600, fontSize: 14, margin: 0 }}>{u.name}</p>
                <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 5px" }}>{u.role}</p>
                {u.stack && (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {u.stack.slice(0, 3).map((s) => (
                      <span key={s} style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 4, padding: "1px 6px", color: "#8b949e", fontSize: 10 }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => toggleFollow(u.id)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 20, background: isFollowed ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.1)", border: isFollowed ? "1.5px solid #6366f1" : "1px solid rgba(99,102,241,0.4)", color: isFollowed ? "#6366f1" : "#818cf8", fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                {isFollowed ? "İzlənir ✓" : "İzlə"}
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── New Conversation Modal ───────────────────────────────────────────────────
function NewConversationModal({ onClose, onSelectUser, existingUserIds }) {
  const [query, setQuery] = useState("");
  const candidates = Object.values(USERS).filter((u) => u.id !== "u1");
  const filtered = candidates.filter((u) =>
    u.name.toLowerCase().includes(query.toLowerCase()) ||
    (u.role || "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#161b22", borderRadius: "18px 18px 0 0", padding: 20, width: "100%", maxHeight: "75vh", display: "flex", flexDirection: "column", border: "1px solid #21262d" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
          <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Yeni Söhbət</p>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer" }}><X size={20} color="#8b949e" /></button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0d1117", border: "1px solid #30363d", borderRadius: 10, padding: "9px 14px", marginBottom: 14 }}>
          <Search size={14} color="#8b949e" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="İstifadəçi axtar..."
            style={{ background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, flex: 1 }} />
        </div>

        <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.length === 0 && (
            <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Heç nə tapılmadı</p>
          )}
          {filtered.map((u) => {
            const hasConvo = existingUserIds.includes(u.id);
            return (
              <button key={u.id} onClick={() => onSelectUser(u.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, background: "#0d1117", border: "1px solid #21262d", borderRadius: 12, padding: 12, cursor: "pointer", textAlign: "left" }}>
                <Avatar user={u} size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#e6edf3", fontWeight: 600, fontSize: 14, margin: 0 }}>{u.name}</p>
                  <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 0" }}>{u.role}</p>
                </div>
                {hasConvo && (
                  <span style={{ color: "#4b5563", fontSize: 11, flexShrink: 0 }}>Söhbət var</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Messages Screen ──────────────────────────────────────────────────────────
function MessagesScreen({ onOpenChat, conversations, onNewConversation }) {
  const [showNewChat, setShowNewChat] = useState(false);
  const existingUserIds = conversations.map((c) => c.userId);

  const handleSelectUser = (userId) => {
    setShowNewChat(false);
    onNewConversation(userId);
  };

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "14px 20px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 18, margin: 0 }}>Mesajlar</p>
        <button onClick={() => setShowNewChat(true)} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "6px 12px", color: "#818cf8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Plus size={13} /> Yeni
        </button>
      </div>
      <div style={{ margin: "0 16px 14px", display: "flex", alignItems: "center", gap: 8, background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "9px 14px" }}>
        <Search size={14} color="#8b949e" />
        <input placeholder="Söhbət axtar..." style={{ background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, flex: 1 }} />
      </div>
      {conversations.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#4b5563" }}>
          <Mail size={36} style={{ marginBottom: 10 }} />
          <p style={{ fontSize: 14, margin: 0 }}>Hələ söhbət yoxdur</p>
          <p style={{ fontSize: 12, margin: "4px 0 0" }}>"Yeni" düyməsinə bas və başla</p>
        </div>
      ) : (
        <div style={{ padding: "0 12px" }}>
          {conversations.map((c) => {
            const user = USERS[c.userId];
            return (
              <button key={c.id} onClick={() => onOpenChat(c)} style={{ width: "100%", background: c.unread > 0 ? "#161b22" : "transparent", border: c.unread > 0 ? "1px solid #21262d" : "1px solid transparent", borderRadius: 14, padding: "14px", marginBottom: 6, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
                <div style={{ position: "relative" }}>
                  <Avatar user={user} size={48} />
                  {c.id === "c1" && <div style={{ position: "absolute", bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, background: "#3fb950", border: "2px solid #0d1117" }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ color: "#e6edf3", fontWeight: c.unread > 0 ? 700 : 500, fontSize: 14, margin: 0 }}>{user.name}</p>
                    <span style={{ color: c.unread > 0 ? "#6366f1" : "#8b949e", fontSize: 11 }}>{c.time}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 3 }}>
                    <p style={{ color: c.unread > 0 ? "#c9d1d9" : "#8b949e", fontSize: 12, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200, fontWeight: c.unread > 0 ? 500 : 400 }}>
                      {c.lastMsg || "Yeni söhbət — yazmağa başla"}
                    </p>
                    {c.unread > 0 && <div style={{ width: 20, height: 20, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>{c.unread}</span></div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {showNewChat && (
        <NewConversationModal
          onClose={() => setShowNewChat(false)}
          onSelectUser={handleSelectUser}
          existingUserIds={existingUserIds}
        />
      )}
    </div>
  );
}

// ─── Chat Screen ──────────────────────────────────────────────────────────────
function ChatScreen({ convo, onBack }) {
  const [messages, setMessages] = useState(convo.messages);
  const [input, setInput] = useState("");
  const user = USERS[convo.userId];

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { id: `m${Date.now()}`, from: "u1", text: input.trim(), time: "İndi", read: false }]);
    setInput("");
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #21262d", background: "#161b22", flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ArrowLeft size={20} color="#8b949e" /></button>
        <div style={{ position: "relative" }}>
          <Avatar user={user} size={38} />
          {convo.id === "c1" && <div style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: 5, background: "#3fb950", border: "2px solid #161b22" }} />}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontWeight: 600, fontSize: 14, margin: 0 }}>{user.name}</p>
          <p style={{ color: convo.id === "c1" ? "#3fb950" : "#8b949e", fontSize: 11, margin: 0 }}>{convo.id === "c1" ? "Online" : user.role}</p>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg) => {
          const isMe = msg.from === "u1";
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: isMe ? "row-reverse" : "row", alignItems: "flex-end", gap: 8 }}>
              {!isMe && <Avatar user={USERS[msg.from]} size={28} />}
              <div style={{ maxWidth: "72%" }}>
                <div style={{ background: isMe ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#161b22", border: isMe ? "none" : "1px solid #21262d", borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "10px 14px" }}>
                  <p style={{ color: "#e6edf3", fontSize: 13, margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, justifyContent: isMe ? "flex-end" : "flex-start" }}>
                  <span style={{ color: "#4b5563", fontSize: 10 }}>{msg.time}</span>
                  {isMe && (msg.read ? <CheckCheck size={12} color="#6366f1" /> : <Check size={12} color="#4b5563" />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ padding: "10px 12px 24px", background: "#161b22", borderTop: "1px solid #21262d", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}><Paperclip size={18} color="#8b949e" /></button>
        <div style={{ flex: 1, background: "#0d1117", border: "1px solid #30363d", borderRadius: 22, display: "flex", alignItems: "center", padding: "0 12px" }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Mesaj yaz..."
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, padding: "10px 0" }} />
          <button style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 0 4px 8px" }}><Smile size={16} color="#8b949e" /></button>
        </div>
        <button onClick={send} style={{ width: 40, height: 40, borderRadius: 20, background: input.trim() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#21262d", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
          <Send size={16} color={input.trim() ? "#fff" : "#4b5563"} />
        </button>
      </div>
    </div>
  );
}

// ─── Settings Screen ──────────────────────────────────────────────────────────
function SettingsScreen({ userProfile, onUpdateProfile, onLogout }) {
  const [section, setSection] = useState(null); // null | "profile" | "security" | "notifications" | "app"

  // ── Profile edit state ──
  const [name, setName]       = useState(userProfile?.name || "");
  const [username, setUsername] = useState(userProfile?.username || "");
  const [bio, setBio]         = useState(userProfile?.bio || "");
  const [stackInput, setStackInput] = useState("");
  const [stack, setStack]     = useState(userProfile?.stack || []);
  const [avatarColor, setAvatarColor] = useState(userProfile?.role?.color || "#6366f1");
  const [profileSaved, setProfileSaved] = useState(false);

  // ── Security state ──
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [twoFA, setTwoFA]             = useState(false);
  const [securitySaved, setSecuritySaved] = useState(false);

  // ── Notification state ──
  const [notifs, setNotifs] = useState({
    likes: true, comments: true, messages: true,
    follows: true, jobs: false, digest: true,
  });

  // ── App state ──
  const [theme, setTheme]   = useState("dark");
  const [lang, setLang]     = useState("az");
  const [sound, setSound]   = useState(true);

  const AVATAR_COLORS = ["#6366f1","#ec4899","#10b981","#f59e0b","#3b82f6","#8b5cf6","#ef4444","#06b6d4"];

  const saveProfile = () => {
    onUpdateProfile({ ...userProfile, name, username, bio, stack, role: { ...(userProfile?.role || {}), color: avatarColor } });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const saveSecurity = () => {
    setCurrentPass(""); setNewPass("");
    setSecuritySaved(true);
    setTimeout(() => setSecuritySaved(false), 2000);
  };

  const addStack = (s) => {
    const t = s.trim();
    if (t && !stack.includes(t)) setStack((prev) => [...prev, t]);
    setStackInput("");
  };

  const removeStack = (s) => setStack((prev) => prev.filter((x) => x !== s));

  const toggleNotif = (key) => setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── row helpers ──
  const Row = ({ icon, label, value, onPress, danger }) => (
    <button onClick={onPress} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: danger ? "rgba(248,81,73,0.1)" : "#21262d", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ color: danger ? "#f85149" : "#e6edf3", fontSize: 14, fontWeight: 500, margin: 0 }}>{label}</p>
        {value && <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 0" }}>{value}</p>}
      </div>
      <ChevronRight size={16} color={danger ? "#f85149" : "#4b5563"} />
    </button>
  );

  const Toggle = ({ label, desc, checked, onChange }) => (
    <div style={{ display: "flex", alignItems: "center", padding: "13px 16px", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <p style={{ color: "#e6edf3", fontSize: 14, fontWeight: 500, margin: 0 }}>{label}</p>
        {desc && <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 0" }}>{desc}</p>}
      </div>
      <button onClick={onChange} style={{ width: 44, height: 24, borderRadius: 12, background: checked ? "#6366f1" : "#30363d", border: "none", cursor: "pointer", position: "relative", flexShrink: 0, transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 3, left: checked ? 23 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left 0.2s" }} />
      </button>
    </div>
  );

  const SectionHeader = ({ title }) => (
    <p style={{ color: "#4b5563", fontSize: 11, fontWeight: 700, padding: "16px 16px 6px", margin: 0, letterSpacing: "0.5px" }}>{title}</p>
  );

  const Divider = () => <div style={{ height: 1, background: "#21262d", margin: "0 16px" }} />;

  const SaveBar = ({ onSave, saved, disabled }) => (
    <div style={{ padding: "16px", paddingBottom: 24 }}>
      <button onClick={onSave} disabled={disabled}
        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: saved ? "#238636" : disabled ? "#21262d" : "linear-gradient(135deg,#6366f1,#8b5cf6)", color: saved || !disabled ? "#fff" : "#4b5563", fontWeight: 800, fontSize: 15, cursor: disabled ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {saved ? <><Check size={16} /> Saxlanıldı!</> : "Yadda saxla"}
      </button>
    </div>
  );

  // ── Sub-section: Profile ──
  if (section === "profile") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #21262d", flexShrink: 0 }}>
        <button onClick={() => setSection(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ArrowLeft size={20} color="#8b949e" /></button>
        <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Profil Redaktəsi</p>
      </div>

      {/* Avatar color picker */}
      <div style={{ padding: "24px 16px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, borderBottom: "1px solid #21262d" }}>
        <div style={{ position: "relative" }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, color: "#fff", border: "3px solid #30363d" }}>
            {(name || userProfile?.name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, background: "#161b22", border: "2px solid #0d1117", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Camera size={11} color="#8b949e" />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {AVATAR_COLORS.map((c) => (
            <button key={c} onClick={() => setAvatarColor(c)} style={{ width: 26, height: 26, borderRadius: 13, background: c, border: avatarColor === c ? "3px solid #fff" : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </div>

      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Name */}
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>AD SOYAD</p>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={15} color="#4b5563" />
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın Soyadın"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
          </div>
        </div>
        {/* Username */}
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>İSTİFADƏÇİ ADI</p>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <AtSign size={15} color="#4b5563" />
            <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="username"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
          </div>
        </div>
        {/* Bio */}
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>BİO</p>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px" }}>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Özün haqqında qısa məlumat..."
              style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13, resize: "none", boxSizing: "border-box" }} />
            <p style={{ color: "#4b5563", fontSize: 11, margin: "4px 0 0", textAlign: "right" }}>{bio.length}/160</p>
          </div>
        </div>
        {/* Stack */}
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>STACK / ALƏTLƏR</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {stack.map((s) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ color: "#818cf8", fontSize: 12 }}>{s}</span>
                <button onClick={() => removeStack(s)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}><X size={11} color="#818cf8" /></button>
              </div>
            ))}
          </div>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <input value={stackInput} onChange={(e) => setStackInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addStack(stackInput); } }}
              placeholder="React, Node.js... (Enter ilə əlavə et)"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 13 }} />
            <button onClick={() => addStack(stackInput)} style={{ background: "#21262d", border: "none", borderRadius: 6, padding: "4px 10px", color: "#8b949e", fontSize: 12, cursor: "pointer" }}>+</button>
          </div>
        </div>
      </div>
      <SaveBar onSave={saveProfile} saved={profileSaved} disabled={!name.trim() || !username.trim()} />
    </div>
  );

  // ── Sub-section: Security ──
  if (section === "security") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #21262d", flexShrink: 0 }}>
        <button onClick={() => setSection(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ArrowLeft size={20} color="#8b949e" /></button>
        <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Təhlükəsizlik</p>
      </div>
      <div style={{ padding: "20px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>CARİ ŞİFRƏ</p>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Key size={15} color="#4b5563" />
            <input value={currentPass} onChange={(e) => setCurrentPass(e.target.value)} type={showCurrent ? "text" : "password"} placeholder="Cari şifrəni daxil et"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
            <button onClick={() => setShowCurrent((p) => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {showCurrent ? <Eye size={15} color="#4b5563" /> : <EyeOff size={15} color="#4b5563" />}
            </button>
          </div>
        </div>
        <div>
          <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>YENİ ŞİFRƏ</p>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
            <Lock size={15} color="#4b5563" />
            <input value={newPass} onChange={(e) => setNewPass(e.target.value)} type={showNew ? "text" : "password"} placeholder="Ən azı 8 simvol"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
            <button onClick={() => setShowNew((p) => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {showNew ? <Eye size={15} color="#4b5563" /> : <EyeOff size={15} color="#4b5563" />}
            </button>
          </div>
          {newPass.length > 0 && newPass.length < 8 && (
            <p style={{ color: "#f85149", fontSize: 11, margin: "6px 0 0" }}>Şifrə ən azı 8 simvol olmalıdır</p>
          )}
        </div>

        <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", overflow: "hidden", marginTop: 4 }}>
          <Toggle label="İki mərhələli doğrulama" desc="SMS və ya authenticator app" checked={twoFA} onChange={() => setTwoFA((p) => !p)} />
        </div>

        <div style={{ background: "rgba(248,81,73,0.05)", border: "1px solid rgba(248,81,73,0.2)", borderRadius: 12, padding: "14px 16px", marginTop: 8 }}>
          <p style={{ color: "#f85149", fontSize: 13, fontWeight: 700, margin: "0 0 4px" }}>⚠️ Təhlükəli zona</p>
          <p style={{ color: "#8b949e", fontSize: 12, margin: "0 0 12px" }}>Bu əməliyyatlar geri alına bilməz.</p>
          <button style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid rgba(248,81,73,0.4)", background: "transparent", color: "#f85149", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Trash2 size={14} /> Hesabı sil
          </button>
        </div>
      </div>
      <SaveBar onSave={saveSecurity} saved={securitySaved} disabled={!currentPass || newPass.length < 8} />
    </div>
  );

  // ── Sub-section: Notifications ──
  if (section === "notifications") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #21262d", flexShrink: 0 }}>
        <button onClick={() => setSection(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ArrowLeft size={20} color="#8b949e" /></button>
        <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Bildirişlər</p>
      </div>
      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "16px", overflow: "hidden" }}>
        <SectionHeader title="AKTİVLİK" />
        <Toggle label="Bəyənmələr" desc="Postlarını biri bəyənəndə" checked={notifs.likes} onChange={() => toggleNotif("likes")} />
        <Divider />
        <Toggle label="Şərhlər" desc="Postuna şərh yazılanda" checked={notifs.comments} onChange={() => toggleNotif("comments")} />
        <Divider />
        <Toggle label="İzləyicilər" desc="Yeni izləyici qazananda" checked={notifs.follows} onChange={() => toggleNotif("follows")} />
        <SectionHeader title="MESAJLAR" />
        <Toggle label="DM Bildirişləri" desc="Yeni mesaj gələndə" checked={notifs.messages} onChange={() => toggleNotif("messages")} />
        <SectionHeader title="DİGƏR" />
        <Toggle label="İş Elanları" desc="Profil məlumatlarına uyğun elanlar" checked={notifs.jobs} onChange={() => toggleNotif("jobs")} />
        <Divider />
        <Toggle label="Həftəlik Xülasə" desc="Həftəlik fəaliyyət məlumatı" checked={notifs.digest} onChange={() => toggleNotif("digest")} />
      </div>

      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "0 16px", overflow: "hidden" }}>
        <SectionHeader title="SƏS" />
        <Toggle label="Bildiriş səsi" desc="Yeni bildiriş gələndə səs" checked={sound} onChange={() => setSound((p) => !p)} />
      </div>
    </div>
  );

  // ── Sub-section: App ──
  if (section === "app") return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid #21262d", flexShrink: 0 }}>
        <button onClick={() => setSection(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}><ArrowLeft size={20} color="#8b949e" /></button>
        <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>Tətbiq</p>
      </div>

      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "16px", overflow: "hidden" }}>
        <SectionHeader title="GÖRÜNÜŞ" />
        <div style={{ padding: "12px 16px" }}>
          <p style={{ color: "#e6edf3", fontSize: 14, fontWeight: 500, margin: "0 0 10px" }}>Tema</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[["dark", <Moon size={14} />, "Tünd"], ["light", <Sun size={14} />, "İşıqlı"], ["system", <Smartphone size={14} />, "Sistem"]].map(([id, icon, label]) => (
              <button key={id} onClick={() => setTheme(id)}
                style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: theme === id ? "1.5px solid #6366f1" : "1px solid #30363d", background: theme === id ? "rgba(99,102,241,0.1)" : "#0d1117", color: theme === id ? "#818cf8" : "#8b949e", fontSize: 12, fontWeight: theme === id ? 700 : 400, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                {icon}{label}
              </button>
            ))}
          </div>
        </div>
        <Divider />
        <SectionHeader title="DİL" />
        <div style={{ padding: "4px 16px 14px", display: "flex", gap: 8 }}>
          {[["az", "🇦🇿 Azərbaycanca"], ["en", "🇬🇧 English"], ["ru", "🇷🇺 Русский"]].map(([id, label]) => (
            <button key={id} onClick={() => setLang(id)}
              style={{ flex: 1, padding: "9px 4px", borderRadius: 10, border: lang === id ? "1.5px solid #6366f1" : "1px solid #30363d", background: lang === id ? "rgba(99,102,241,0.1)" : "#0d1117", color: lang === id ? "#818cf8" : "#8b949e", fontSize: 11, fontWeight: lang === id ? 700 : 400, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "0 16px", overflow: "hidden" }}>
        <SectionHeader title="HAQQINDA" />
        <Row icon={<Info size={16} color="#8b949e" />} label="Versiya" value="devfeed v1.0.0" onPress={() => {}} />
        <Divider />
        <Row icon={<HelpCircle size={16} color="#8b949e" />} label="Yardım mərkəzi" onPress={() => {}} />
        <Divider />
        <Row icon={<Star size={16} color="#8b949e" />} label="Tətbiqi qiymətləndir" onPress={() => {}} />
        <Divider />
        <Row icon={<FileText size={16} color="#8b949e" />} label="Gizlilik siyasəti" onPress={() => {}} />
      </div>
    </div>
  );

  // ── Main settings list ──
  const displayName = userProfile?.name || "İstifadəçi";
  const roleLabel = userProfile?.subRole?.label || userProfile?.role?.label || "Developer";
  const roleColor = userProfile?.role?.color || "#6366f1";

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ padding: "20px 16px 14px" }}>
        <p style={{ color: "#e6edf3", fontWeight: 800, fontSize: 20, margin: 0 }}>Tənzimləmələr</p>
      </div>

      {/* Profile summary card */}
      <div style={{ margin: "0 16px 20px", background: "#161b22", borderRadius: 14, padding: "16px", border: "1px solid #21262d", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: roleColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
          {displayName.slice(0, 1).toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 15, margin: 0 }}>{displayName}</p>
          <p style={{ color: "#8b949e", fontSize: 12, margin: "3px 0 0" }}>@{userProfile?.username || "username"} · {roleLabel}</p>
        </div>
        <button onClick={() => setSection("profile")} style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 8, padding: "6px 12px", color: "#818cf8", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          Redaktə
        </button>
      </div>

      {/* Section groups */}
      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "0 16px 12px", overflow: "hidden" }}>
        <SectionHeader title="HESAB" />
        <Row icon={<UserCheck size={16} color="#6366f1" />} label="Profil redaktəsi" value="Ad, bio, stack" onPress={() => setSection("profile")} />
        <Divider />
        <Row icon={<Shield size={16} color="#10b981" />} label="Təhlükəsizlik" value="Şifrə, 2FA" onPress={() => setSection("security")} />
      </div>

      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "0 16px 12px", overflow: "hidden" }}>
        <SectionHeader title="TƏRCİHLƏR" />
        <Row icon={<Bell size={16} color="#f59e0b" />} label="Bildirişlər" value="Bəyənmə, şərh, mesaj" onPress={() => setSection("notifications")} />
        <Divider />
        <Row icon={<Smartphone size={16} color="#3b82f6" />} label="Tətbiq" value="Tema, dil, haqqında" onPress={() => setSection("app")} />
      </div>

      <div style={{ background: "#161b22", borderRadius: 12, border: "1px solid #21262d", margin: "0 16px 12px", overflow: "hidden" }}>
        <SectionHeader title="" />
        <Row icon={<LogOut size={16} color="#f85149" />} label="Çıxış" onPress={onLogout} danger />
      </div>
    </div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
function ProfileScreen({ userProfile, posts, onLike, onBookmark, onAddComment, onLikeComment }) {
  const [showSupport, setShowSupport] = useState(false);
  const [commentPost, setCommentPost] = useState(null);
  const displayName = userProfile?.name || USERS.u1.name;
  const roleLabel = userProfile?.subRole?.label || userProfile?.role?.label || "Full-Stack Dev";
  const roleColor = userProfile?.role?.color || "#6366f1";
  const stack = userProfile?.stack?.length ? userProfile.stack : ["React Native", "Node.js", "PostgreSQL", "Docker"];
  const bio = userProfile?.bio || "";
  const authMethod = userProfile?.authMethod;
  const avatarUser = { ...USERS.u1, name: displayName, color: roleColor };

  const myUserId = userProfile?.id || "u1";
  const myPosts = posts.filter((p) => p.userId === myUserId);

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingBottom: 80 }}>
      <div style={{ height: 100, background: "linear-gradient(135deg,#1e1057,#0d1117)", position: "relative" }}>
        <div style={{ position: "absolute", bottom: -28, left: 20 }}>
          <Avatar user={avatarUser} size={56} />
        </div>
      </div>
      <div style={{ padding: "36px 20px 0" }}>
        <p style={{ color: "#e6edf3", fontSize: 18, fontWeight: 700, margin: 0 }}>{displayName}</p>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ background: roleColor + "20", border: "1px solid " + roleColor + "50", borderRadius: 6, padding: "2px 8px", color: roleColor, fontSize: 11, fontWeight: 700 }}>
            {roleLabel}
          </span>
          {authMethod === "github" && (
            <span style={{ display: "flex", alignItems: "center", gap: 4, background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "2px 8px", color: "#8b949e", fontSize: 11 }}>
              <Github size={10} /> GitHub
            </span>
          )}
          {authMethod === "google" && (
            <span style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 6, padding: "2px 8px", color: "#8b949e", fontSize: 11 }}>G Google</span>
          )}
        </div>

        {bio ? <p style={{ color: "#8b949e", fontSize: 13, margin: "0 0 12px", lineHeight: 1.5 }}>{bio}</p> : <div style={{ marginBottom: 12 }} />}

        <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
          {[["128", "Paylaşım"], ["2.4k", "İzləyici"], ["340", "İzlənən"]].map(([v, l]) => (
            <div key={l} style={{ textAlign: "center" }}>
              <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 16, margin: 0 }}>{v}</p>
              <p style={{ color: "#8b949e", fontSize: 11, margin: 0 }}>{l}</p>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {stack.map((s) => (
            <span key={s} style={{ background: "#0d1117", border: "1px solid #30363d", borderRadius: 20, padding: "3px 10px", color: "#8b949e", fontSize: 11 }}>{s}</span>
          ))}
        </div>

        <button onClick={() => setShowSupport(true)} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "1.5px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.07)", color: "#f59e0b", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 20 }}>
          ☕ Dəstək ol · ₼1-dən başlayır
        </button>

        <p style={{ color: "#8b949e", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>SON PAYLAŞIMLAR</p>
        {myPosts.map((p) => {
          const liveP = posts.find((x) => x.id === p.id) || p;
          return (
            <PostCard key={liveP.id} post={liveP} onLike={onLike} onBookmark={onBookmark}
              onComment={(post) => setCommentPost(post)} />
          );
        })}
      </div>
      {showSupport && <SupportModal user={avatarUser} onClose={() => setShowSupport(false)} />}
      {commentPost && (
        <CommentsModal
          post={posts.find((x) => x.id === commentPost.id) || commentPost}
          onClose={() => setCommentPost(null)}
          onAddComment={onAddComment}
          onLikeComment={onLikeComment}
        />
      )}
    </div>
  );
}

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!email || !password) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onAuth({ method: "email", email, isNew: mode === "register" }); }, 1000);
  };

  const handleSocial = (method) => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onAuth({ method, isNew: mode === "register" }); }, 800);
  };

  return (
    <div style={{ flex: 1, background: "#0d1117", display: "flex", flexDirection: "column", overflowY: "auto" }}>
      <div style={{ background: "linear-gradient(160deg,#1e1057,#0d1117 60%)", padding: "52px 32px 36px", textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(99,102,241,0.2)", border: "1.5px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Terminal size={22} color="#818cf8" />
          </div>
          <span style={{ color: "#e6edf3", fontSize: 26, fontWeight: 900, letterSpacing: "-1px" }}>
            dev<span style={{ color: "#6366f1" }}>feed</span>
          </span>
        </div>
        <p style={{ color: "#8b949e", fontSize: 13, margin: 0, lineHeight: 1.6 }}>Developer-lər üçün sosial platforma. Layihəni paylaş, komanda tap, böyü.</p>
      </div>

      <div style={{ padding: "24px 24px 40px", flex: 1 }}>
        <div style={{ display: "flex", background: "#161b22", borderRadius: 10, padding: 4, marginBottom: 24, border: "1px solid #21262d" }}>
          {[["login", "Daxil ol"], ["register", "Qeydiyyat"]].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "9px 0", borderRadius: 7, border: "none", background: mode === m ? "#6366f1" : "transparent", color: mode === m ? "#fff" : "#8b949e", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{l}</button>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
          <button onClick={() => handleSocial("github")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px", borderRadius: 12, background: "#161b22", border: "1px solid #30363d", color: "#e6edf3", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            <Github size={18} /> GitHub ilə davam et
          </button>
          <button onClick={() => handleSocial("google")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "13px", borderRadius: 12, background: "#161b22", border: "1px solid #30363d", color: "#e6edf3", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: "#4285f4" }}>G</span> Google ilə davam et
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: "#21262d" }} />
          <span style={{ color: "#4b5563", fontSize: 12 }}>yaxud e-mail ilə</span>
          <div style={{ flex: 1, height: 1, background: "#21262d" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
            <Mail size={16} color="#4b5563" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email"
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
          </div>
          <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
            <Lock size={16} color="#4b5563" />
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifrə" type={showPass ? "text" : "password"}
              style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14 }} />
            <button onClick={() => setShowPass((p) => !p)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {showPass ? <Eye size={16} color="#4b5563" /> : <EyeOff size={16} color="#4b5563" />}
            </button>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || !email || !password}
          style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none", background: email && password ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#21262d", color: email && password ? "#fff" : "#4b5563", fontWeight: 800, fontSize: 15, cursor: email && password ? "pointer" : "default" }}>
          {loading ? "Yüklənir..." : mode === "login" ? "Daxil ol →" : "Qeydiyyat →"}
        </button>
        <p style={{ color: "#4b5563", fontSize: 11, textAlign: "center", marginTop: 16 }}>Davam etməklə İstifadəçi Şərtlərini qəbul etmiş olursunuz.</p>
      </div>
    </div>
  );
}

// ─── Onboarding Screen ────────────────────────────────────────────────────────
function StepDots({ current, total }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ height: 4, borderRadius: 2, background: i <= current ? "#6366f1" : "#21262d", width: i === current ? 24 : 14, transition: "all 0.3s" }} />
      ))}
    </div>
  );
}

function OnboardingScreen({ authData, onComplete }) {
  const [step, setStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedSubRole, setSelectedSubRole] = useState(null);
  const [selectedStack, setSelectedStack] = useState([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const hasSubRoles = selectedRole && SUB_ROLES[selectedRole.id];
  const totalSteps = hasSubRoles ? 4 : 3;
  const stackKey = selectedSubRole?.id || selectedRole?.id || "default";
  const stacks = TECH_STACKS[stackKey] || TECH_STACKS["default"];

  const isLastStep = hasSubRoles ? step === 3 : step === 2;

  const canNext = () => {
    if (step === 0) return name.trim().length > 1 && username.trim().length > 1;
    if (step === 1) return !!selectedRole;
    if (step === 2 && hasSubRoles) return !!selectedSubRole;
    return true;
  };

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const finish = () => {
    onComplete({ name, username, role: selectedRole, subRole: selectedSubRole, stack: selectedStack, bio, authMethod: authData.method });
  };

  const toggleStack = (s) => setSelectedStack((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  return (
    <div style={{ flex: 1, background: "#0d1117", display: "flex", flexDirection: "column", padding: "48px 24px 36px", overflowY: "auto" }}>
      <StepDots current={step} total={totalSteps} />

      {/* Step 0 — Ad */}
      {step === 0 && (
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Salam! 👋</p>
          <p style={{ color: "#8b949e", fontSize: 14, marginBottom: 28 }}>Özün haqqında bir az danış</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>AD SOYAD</p>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px" }}>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Adın Soyadın"
                  style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 15 }} />
              </div>
            </div>
            <div>
              <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>İSTİFADƏÇİ ADI</p>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: "#4b5563", fontSize: 15 }}>@</span>
                <input value={username} onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))} placeholder="username"
                  style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 15 }} />
              </div>
            </div>
            <div>
              <p style={{ color: "#8b949e", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>BİO <span style={{ color: "#4b5563", fontWeight: 400 }}>(istəyə bağlı)</span></p>
              <div style={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 10, padding: "12px 14px" }}>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Özün haqqında qısa məlumat..." rows={3}
                  style={{ width: "100%", background: "none", border: "none", outline: "none", color: "#e6edf3", fontSize: 14, resize: "none" }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Rol */}
      {step === 1 && (
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Sən kimsən? 🤔</p>
          <p style={{ color: "#8b949e", fontSize: 14, marginBottom: 20 }}>Rolunu seç — feed buna görə fərqləşəcək</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {ROLES.map((role) => {
              const IconComp = role.icon;
              const isSel = selectedRole?.id === role.id;
              return (
                <button key={role.id} onClick={() => setSelectedRole(role)}
                  style={{ padding: "14px 12px", borderRadius: 14, border: isSel ? `2px solid ${role.color}` : "1px solid #21262d", background: isSel ? role.color + "15" : "#161b22", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: role.color + "20", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid " + role.color + "40" }}>
                    <IconComp size={18} color={role.color} />
                  </div>
                  <div>
                    <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 13, margin: 0 }}>{role.label}</p>
                    <p style={{ color: "#8b949e", fontSize: 11, margin: "2px 0 0", lineHeight: 1.4 }}>{role.desc}</p>
                  </div>
                  {isSel && (
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <UserCheck size={14} color={role.color} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 — Sub-rol */}
      {step === 2 && hasSubRoles && (
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Daha dəqiq? 🎯</p>
          <p style={{ color: "#8b949e", fontSize: 14, marginBottom: 20 }}>
            <span style={{ color: selectedRole.color }}>{selectedRole.label}</span> kimi — hansı sahə?
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SUB_ROLES[selectedRole.id].map((sub) => {
              const isSel = selectedSubRole?.id === sub.id;
              return (
                <button key={sub.id} onClick={() => setSelectedSubRole(sub)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", borderRadius: 14, border: isSel ? `2px solid ${selectedRole.color}` : "1px solid #21262d", background: isSel ? selectedRole.color + "12" : "#161b22", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 24 }}>{sub.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ color: "#e6edf3", fontWeight: 700, fontSize: 14, margin: 0 }}>{sub.label}</p>
                    <p style={{ color: "#8b949e", fontSize: 12, margin: "2px 0 0" }}>{sub.desc}</p>
                  </div>
                  {isSel && <Check size={16} color={selectedRole.color} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 (or 2 for no-subrole) — Stack */}
      {isLastStep && (
        <div style={{ flex: 1 }}>
          <p style={{ color: "#e6edf3", fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Stack / Alətlər 🛠️</p>
          <p style={{ color: "#8b949e", fontSize: 14, marginBottom: 20 }}>İstifadə etdiyin texnologiyaları seç <span style={{ color: "#4b5563" }}>(istəyə bağlı)</span></p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {stacks.map((s) => {
              const isSel = selectedStack.includes(s);
              return (
                <button key={s} onClick={() => toggleStack(s)}
                  style={{ padding: "8px 14px", borderRadius: 20, border: isSel ? "1.5px solid #6366f1" : "1px solid #30363d", background: isSel ? "rgba(99,102,241,0.15)" : "#161b22", color: isSel ? "#818cf8" : "#8b949e", fontWeight: isSel ? 700 : 400, fontSize: 13, cursor: "pointer" }}>
                  {s}
                </button>
              );
            })}
          </div>
          {selectedStack.length > 0 && <p style={{ color: "#4b5563", fontSize: 12, marginTop: 14 }}>{selectedStack.length} seçildi</p>}
        </div>
      )}

      {/* Nav */}
      <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
        {step > 0 && (
          <button onClick={back} style={{ width: 48, height: 48, borderRadius: 12, border: "1px solid #30363d", background: "#161b22", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <ChevronLeft size={20} color="#8b949e" />
          </button>
        )}
        {!isLastStep ? (
          <button onClick={next} disabled={!canNext()}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: canNext() ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "#21262d", color: canNext() ? "#fff" : "#4b5563", fontWeight: 800, fontSize: 15, cursor: canNext() ? "pointer" : "default" }}>
            İrəli →
          </button>
        ) : (
          <button onClick={finish}
            style={{ flex: 1, padding: "14px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#10b981,#059669)", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <UserCheck size={18} /> Profili tamamla!
          </button>
        )}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────
export default function App() {
  const [appScreen, setAppScreen] = useState("auth");
  const [authData, setAuthData] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [tab, setTab] = useState("feed");
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [activeChat, setActiveChat] = useState(null);
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [conversations, setConversations] = useState(INITIAL_CONVERSATIONS);

  const notifCount = notifications.filter((n) => !n.read).length;
  const handleMarkAllRead = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const totalDmUnread = conversations.reduce((s, c) => s + c.unread, 0);

  const handleLike = (id) => setPosts((p) => p.map((x) => x.id === id ? { ...x, liked: !x.liked } : x));
  const handleBookmark = (id) => setPosts((p) => p.map((x) => x.id === id ? { ...x, bookmarked: !x.bookmarked } : x));
  const handleAddPost = (newPost) => setPosts((p) => [newPost, ...p]);

  const handleAddComment = (postId, comment) =>
    setPosts((p) => p.map((x) => x.id === postId
      ? { ...x, commentsList: [...(x.commentsList || []), comment], comments: (x.comments || 0) + 1 }
      : x));

  const handleLikeComment = (postId, commentId) =>
    setPosts((p) => p.map((x) => x.id === postId
      ? { ...x, commentsList: (x.commentsList || []).map((c) => c.id === commentId ? { ...c, liked: !c.liked } : c) }
      : x));

  const handleOpenChat = (c) => {
    setConversations((prev) =>
      prev.map((conv) => conv.id === c.id ? { ...conv, unread: 0 } : conv)
    );
    setActiveChat(c);
  };

  const handleNewConversation = (userId) => {
    const existing = conversations.find((c) => c.userId === userId);
    if (existing) {
      handleOpenChat(existing);
      return;
    }
    const newConvo = {
      id: `c${Date.now()}`,
      userId,
      lastMsg: "",
      time: "İndi",
      unread: 0,
      messages: [],
    };
    setConversations((prev) => [newConvo, ...prev]);
    setActiveChat(newConvo);
  };

  const handleAuth = (data) => {
    setAuthData(data);
    if (data.isNew) {
      setAppScreen("onboarding");
    } else {
      setUserProfile({ name: "Dastan Məmmədov", username: "dastan", role: ROLES[0], subRole: SUB_ROLES.developer[2], stack: ["React Native", "Node.js", "PostgreSQL"], bio: "", authMethod: data.method });
      setAppScreen("main");
    }
  };

  const handleOnboardingComplete = (profile) => {
    setUserProfile(profile);
    setAppScreen("main");
  };

  const handleUpdateProfile = (updated) => {
    setUserProfile(updated);
  };

  const handleLogout = () => {
    setUserProfile(null);
    setAuthData(null);
    setTab("feed");
    setAppScreen("auth");
  };

  const tabs = [
    { id: "feed",     icon: <Zap size={20} />,      label: "Feed" },
    { id: "explore",  icon: <Search size={20} />,    label: "Kəşf et" },
    { id: "messages", icon: <Mail size={20} />,      label: "Mesajlar", badge: totalDmUnread },
    { id: "profile",  icon: <Users size={20} />,     label: "Profil" },
    { id: "settings", icon: <Settings size={20} />,  label: "Ayarlar" },
  ];

  const shell = (
    <div style={{ maxWidth: 420, height: "100vh", margin: "0 auto", background: "#0d1117", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", position: "relative", overflow: "hidden" }}>
      {!activeChat && (
        <div style={{ padding: "14px 20px", display: "flex", alignItems: "center", borderBottom: "1px solid #21262d", background: "#0d1117", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Terminal size={20} color="#6366f1" />
            <span style={{ color: "#e6edf3", fontSize: 18, fontWeight: 800, letterSpacing: "-0.5px" }}>
              dev<span style={{ color: "#6366f1" }}>feed</span>
            </span>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setShowNotifs(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 8, position: "relative" }}>
              <Bell size={20} color={notifCount > 0 ? "#e6edf3" : "#8b949e"} />
              {notifCount > 0 && (
                <div style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: 8, background: "#f85149", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>{notifCount}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: "hidden", display: "flex", flexDirection: "column" }}>
        {activeChat ? (
          <ChatScreen convo={activeChat} onBack={() => setActiveChat(null)} />
        ) : (
          <>
            {tab === "feed"     && <FeedScreen posts={posts} onAddPost={handleAddPost} onLike={handleLike} onBookmark={handleBookmark} onAddComment={handleAddComment} onLikeComment={handleLikeComment} />}
            {tab === "explore"  && <ExploreScreen />}
            {tab === "messages" && <MessagesScreen conversations={conversations} onOpenChat={handleOpenChat} onNewConversation={handleNewConversation} />}
            {tab === "profile"  && <ProfileScreen userProfile={userProfile} posts={posts} onLike={handleLike} onBookmark={handleBookmark} onAddComment={handleAddComment} onLikeComment={handleLikeComment} />}
            {tab === "settings" && <SettingsScreen userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onLogout={handleLogout} />}
          </>
        )}
      </div>
      {!activeChat && (
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 420, background: "#161b22", borderTop: "1px solid #21262d", display: "flex", padding: "8px 0 16px" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: tab === t.id ? "#6366f1" : "#8b949e", padding: "6px 0", position: "relative" }}>
              {t.icon}
              {t.badge > 0 && (
                <div style={{ position: "absolute", top: 2, right: "calc(50% - 18px)", width: 16, height: 16, borderRadius: 8, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ color: "#fff", fontSize: 9, fontWeight: 700 }}>{t.badge}</span>
                </div>
              )}
              <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>
      )}
      {showNotifs && (
        <NotificationsScreen
          notifications={notifications}
          onMarkRead={handleMarkAllRead}
          onClose={() => setShowNotifs(false)}
        />
      )}
    </div>
  );

  if (appScreen === "auth") return (
    <div style={{ maxWidth: 420, height: "100vh", margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", background: "#0d1117" }}>
      <AuthScreen onAuth={handleAuth} />
    </div>
  );

  if (appScreen === "onboarding") return (
    <div style={{ maxWidth: 420, height: "100vh", margin: "0 auto", display: "flex", flexDirection: "column", fontFamily: "'Inter', -apple-system, sans-serif", background: "#0d1117" }}>
      <OnboardingScreen authData={authData} onComplete={handleOnboardingComplete} />
    </div>
  );

  return shell;
}
