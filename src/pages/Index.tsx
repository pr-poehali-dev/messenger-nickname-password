import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/e2057fd0-b6bf-44f9-bf49-98f5182a5a37";

const TOKEN_KEY = "waves_token";
const USER_KEY = "waves_user";

async function apiAuth(action: string, body?: object, token?: string) {
  const res = await fetch(`${AUTH_URL}/?action=${action}`, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-Auth-Token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

interface AuthUser {
  id: number;
  username: string;
  token: string;
}

function AuthScreen({ onAuth }: { onAuth: (user: AuthUser) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiAuth(mode, { username, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify({ id: data.id, username: data.username }));
      onAuth({ id: data.id, username: data.username, token: data.token });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary))" }}>
            <Icon name="Waves" size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold">Waves</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}
          </p>
        </div>

        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ник</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="минимум 3 символа"
              className="w-full px-4 py-2.5 text-sm bg-muted rounded-xl outline-none border border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="минимум 4 символа"
              className="w-full px-4 py-2.5 text-sm bg-muted rounded-xl outline-none border border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground"
              autoComplete={mode === "register" ? "new-password" : "current-password"}
              required
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={15} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            style={{ background: "hsl(var(--primary))" }}
          >
            {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button
            onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); }}
            className="text-primary font-medium hover:underline"
          >
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
    </div>
  );
}

type Tab = "chats" | "contacts" | "search" | "profile" | "settings";
type Theme = "light" | "dark";

interface Message {
  id: number;
  text: string;
  out: boolean;
  time: string;
  read: boolean;
}

interface Chat {
  id: number;
  name: string;
  avatar: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  phone: string;
  online: boolean;
  lastSeen: string;
}

interface Notification {
  id: number;
  text: string;
  time: string;
  read: boolean;
  type: "message" | "activity";
}

const CHATS: Chat[] = [
  {
    id: 1,
    name: "Алексей Петров",
    avatar: "АП",
    lastMsg: "Окей, созвонимся завтра!",
    time: "14:32",
    unread: 2,
    online: true,
    messages: [
      { id: 1, text: "Привет! Как дела?", out: false, time: "14:20", read: true },
      { id: 2, text: "Всё отлично, спасибо! Ты как?", out: true, time: "14:21", read: true },
      { id: 3, text: "Тоже хорошо. Хотел спросить насчёт проекта", out: false, time: "14:25", read: true },
      { id: 4, text: "Давай обсудим, что именно нужно сделать?", out: true, time: "14:28", read: true },
      { id: 5, text: "Окей, созвонимся завтра!", out: false, time: "14:32", read: false },
    ],
  },
  {
    id: 2,
    name: "Команда Маркетинг",
    avatar: "КМ",
    lastMsg: "Презентация готова, смотри в файлах",
    time: "12:15",
    unread: 5,
    online: false,
    messages: [
      { id: 1, text: "Всем привет! Новая кампания стартует в понедельник", out: false, time: "11:00", read: true },
      { id: 2, text: "Отличные новости!", out: true, time: "11:05", read: true },
      { id: 3, text: "Презентация готова, смотри в файлах", out: false, time: "12:15", read: false },
    ],
  },
  {
    id: 3,
    name: "Мария Иванова",
    avatar: "МИ",
    lastMsg: "Спасибо за помощь 🙏",
    time: "Вчера",
    unread: 0,
    online: true,
    messages: [
      { id: 1, text: "Можешь помочь с документами?", out: false, time: "Вчера 18:10", read: true },
      { id: 2, text: "Конечно, пришли что нужно", out: true, time: "Вчера 18:12", read: true },
      { id: 3, text: "Спасибо за помощь 🙏", out: false, time: "Вчера 19:00", read: true },
    ],
  },
  {
    id: 4,
    name: "Дмитрий Сидоров",
    avatar: "ДС",
    lastMsg: "Встреча перенесена на пятницу",
    time: "Вчера",
    unread: 1,
    online: false,
    messages: [
      { id: 1, text: "Встреча перенесена на пятницу", out: false, time: "Вчера 16:40", read: false },
    ],
  },
  {
    id: 5,
    name: "Анна Кузнецова",
    avatar: "АК",
    lastMsg: "Хорошо, договорились!",
    time: "Пн",
    unread: 0,
    online: false,
    messages: [
      { id: 1, text: "Хорошо, договорились!", out: false, time: "Пн 10:00", read: true },
    ],
  },
];

const CONTACTS: Contact[] = [
  { id: 1, name: "Алексей Петров", avatar: "АП", phone: "+7 900 123-45-67", online: true, lastSeen: "в сети" },
  { id: 2, name: "Анна Кузнецова", avatar: "АК", phone: "+7 900 234-56-78", online: false, lastSeen: "час назад" },
  { id: 3, name: "Дмитрий Сидоров", avatar: "ДС", phone: "+7 900 345-67-89", online: false, lastSeen: "вчера" },
  { id: 4, name: "Екатерина Новикова", avatar: "ЕН", phone: "+7 900 456-78-90", online: true, lastSeen: "в сети" },
  { id: 5, name: "Мария Иванова", avatar: "МИ", phone: "+7 900 567-89-01", online: true, lastSeen: "в сети" },
  { id: 6, name: "Николай Волков", avatar: "НВ", phone: "+7 900 678-90-12", online: false, lastSeen: "3 дня назад" },
  { id: 7, name: "Ольга Смирнова", avatar: "ОС", phone: "+7 900 789-01-23", online: false, lastSeen: "неделю назад" },
];

const NOTIFICATIONS: Notification[] = [
  { id: 1, text: "Алексей Петров написал вам сообщение", time: "14:32", read: false, type: "message" },
  { id: 2, text: "Команда Маркетинг: 5 новых сообщений", time: "12:15", read: false, type: "message" },
  { id: 3, text: "Мария Иванова сейчас онлайн", time: "11:50", read: false, type: "activity" },
  { id: 4, text: "Дмитрий Сидоров написал вам сообщение", time: "Вчера", read: true, type: "message" },
  { id: 5, text: "Екатерина Новикова стала онлайн", time: "Вчера", read: true, type: "activity" },
];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-purple-500", "bg-emerald-500",
  "bg-orange-500", "bg-rose-500", "bg-cyan-500", "bg-amber-500",
];

function getColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ initials, size = "md", online }: { initials: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  return (
    <div className="relative shrink-0">
      <div className={`${sz} ${getColor(initials)} rounded-full flex items-center justify-center font-semibold text-white`}>
        {initials}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-emerald-400" : "bg-muted-foreground"}`} />
      )}
    </div>
  );
}

export default function Index() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    if (token && userRaw) {
      try { return { ...JSON.parse(userRaw), token }; } catch { return null; }
    }
    return null;
  });

  const [tab, setTab] = useState<Tab>("chats");
  const [theme, setTheme] = useState<Theme>("light");
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>(CHATS);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>(NOTIFICATIONS);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const unreadNotif = notifications.filter(n => !n.read).length;
  const totalUnread = chats.reduce((s, c) => s + c.unread, 0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat]);

  if (!authUser) {
    return <AuthScreen onAuth={setAuthUser} />;
  }

  function sendMessage() {
    if (!inputText.trim() || !activeChat) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
    const newMsg: Message = { id: Date.now(), text: inputText.trim(), out: true, time, read: false };
    setChats(prev => prev.map(c =>
      c.id === activeChat.id
        ? { ...c, messages: [...c.messages, newMsg], lastMsg: inputText.trim(), time }
        : c
    ));
    setActiveChat(prev => prev ? { ...prev, messages: [...prev.messages, newMsg], lastMsg: inputText.trim(), time } : prev);
    setInputText("");
  }

  function openChat(chat: Chat) {
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
    setActiveChat({ ...chat, unread: 0 });
    setTab("chats");
  }

  function markAllNotifRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.lastMsg.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredContacts = CONTACTS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navItems: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", label: "Чаты", badge: totalUnread },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "search", icon: "Search", label: "Поиск" },
    { id: "profile", icon: "User", label: "Профиль" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar nav */}
      <aside className="flex flex-col items-center py-6 px-2 gap-1 border-r border-border bg-card w-16 shrink-0">
        <div className="mb-6 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
          <Icon name="Waves" size={18} className="text-white" />
        </div>
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => { setTab(item.id); setActiveChat(null); }}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${tab === item.id
                ? "bg-accent text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            title={item.label}
          >
            <Icon name={item.icon} size={20} />
            {item.badge ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${showNotifications ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title="Уведомления"
          >
            <Icon name="Bell" size={20} />
            {unreadNotif > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse-dot">
                {unreadNotif}
              </span>
            )}
          </button>
          <button
            onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Сменить тему"
          >
            <Icon name={theme === "light" ? "Moon" : "Sun"} size={20} />
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div className={`flex flex-col border-r border-border bg-background transition-all duration-300 ${activeChat ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0`}>
          {/* Chats */}
          {tab === "chats" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Чаты</h1>
                <div className="mt-3 relative">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none placeholder:text-muted-foreground"
                    placeholder="Поиск чатов..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {filteredChats.map(chat => (
                  <button
                    key={chat.id}
                    onClick={() => openChat(chat)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors duration-150 text-left"
                  >
                    <Avatar initials={chat.avatar} online={chat.online} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{chat.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">{chat.time}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">{chat.lastMsg}</span>
                        {chat.unread > 0 && (
                          <span className="ml-2 shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contacts */}
          {tab === "contacts" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Контакты</h1>
                <p className="text-xs text-muted-foreground mt-1">{CONTACTS.filter(c => c.online).length} в сети</p>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                <div className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">В сети</div>
                {CONTACTS.filter(c => c.online).map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      const chat = chats.find(c => c.name === contact.name);
                      if (chat) openChat(chat);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                  >
                    <Avatar initials={contact.avatar} online={contact.online} />
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-emerald-500">{contact.lastSeen}</div>
                    </div>
                  </button>
                ))}
                <div className="px-4 mt-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Остальные</div>
                {CONTACTS.filter(c => !c.online).map(contact => (
                  <div key={contact.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar initials={contact.avatar} online={contact.online} />
                    <div>
                      <div className="font-medium text-sm">{contact.name}</div>
                      <div className="text-xs text-muted-foreground">{contact.lastSeen}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search */}
          {tab === "search" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Поиск</h1>
                <div className="mt-3 relative">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    autoFocus
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-xl border-none outline-none placeholder:text-muted-foreground"
                    placeholder="Поиск по чатам и контактам..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              {searchQuery.length > 0 && (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {filteredChats.length > 0 && (
                    <>
                      <div className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Чаты</div>
                      {filteredChats.map(chat => (
                        <button key={chat.id} onClick={() => openChat(chat)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                          <Avatar initials={chat.avatar} />
                          <div>
                            <div className="font-medium text-sm">{chat.name}</div>
                            <div className="text-xs text-muted-foreground">{chat.lastMsg}</div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredContacts.length > 0 && (
                    <>
                      <div className="px-4 mt-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Контакты</div>
                      {filteredContacts.map(c => (
                        <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar initials={c.avatar} online={c.online} />
                          <div>
                            <div className="font-medium text-sm">{c.name}</div>
                            <div className="text-xs text-muted-foreground">{c.phone}</div>
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  {filteredChats.length === 0 && filteredContacts.length === 0 && (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">Ничего не найдено</div>
                  )}
                </div>
              )}
              {searchQuery.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Icon name="Search" size={40} className="mb-3 opacity-20" />
                  <p className="text-sm">Введите запрос для поиска</p>
                </div>
              )}
            </div>
          )}

          {/* Profile */}
          {tab === "profile" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Профиль</h1>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4">
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold ${getColor(authUser.username)}`}>
                    {authUser.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-lg">@{authUser.username}</div>
                    <div className="text-sm text-emerald-500">в сети</div>
                  </div>
                </div>
                <div className="space-y-3 mt-2">
                  {[
                    { icon: "AtSign", label: "Ник", value: `@${authUser.username}` },
                    { icon: "Info", label: "О себе", value: "Привет! Я использую Waves" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                      <Icon name={item.icon} size={18} className="text-primary shrink-0" />
                      <div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="text-sm font-medium">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    setAuthUser(null);
                  }}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors"
                >
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}

          {/* Settings */}
          {tab === "settings" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Настройки</h1>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-2 pb-4">
                {[
                  { icon: "Bell", label: "Уведомления", desc: "Звуки и оповещения" },
                  { icon: "Shield", label: "Конфиденциальность", desc: "Кто видит ваши данные" },
                  { icon: "Palette", label: "Оформление", desc: "Тема и шрифты" },
                  { icon: "Smartphone", label: "Устройства", desc: "Активные сессии" },
                  { icon: "HelpCircle", label: "Помощь", desc: "FAQ и поддержка" },
                ].map(item => (
                  <button key={item.label} className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted/60 transition-colors text-left">
                    <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Icon name={item.icon} size={18} className="text-foreground" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-muted-foreground">{item.desc}</div>
                    </div>
                    <Icon name="ChevronRight" size={16} className="ml-auto text-muted-foreground" />
                  </button>
                ))}
                <button
                  onClick={() => {
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    setAuthUser(null);
                  }}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-destructive/10 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Icon name="LogOut" size={18} className="text-destructive" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-destructive">Выйти</div>
                    <div className="text-xs text-muted-foreground">Завершить сеанс</div>
                  </div>
                </button>

                <div className="mt-2 p-3.5 rounded-xl bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                        <Icon name={theme === "light" ? "Moon" : "Sun"} size={18} className="text-foreground" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">Тёмная тема</div>
                        <div className="text-xs text-muted-foreground">{theme === "dark" ? "Включена" : "Выключена"}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat window */}
        {activeChat ? (
          <div className="flex flex-col flex-1 animate-fade-in">
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
              <button
                onClick={() => setActiveChat(null)}
                className="md:hidden mr-1 text-muted-foreground hover:text-foreground"
              >
                <Icon name="ArrowLeft" size={20} />
              </button>
              <Avatar initials={activeChat.avatar} online={activeChat.online} />
              <div>
                <div className="font-semibold text-sm">{activeChat.name}</div>
                <div className={`text-xs ${activeChat.online ? "text-emerald-500" : "text-muted-foreground"}`}>
                  {activeChat.online ? "в сети" : "был недавно"}
                </div>
              </div>
              <div className="ml-auto flex items-center gap-1">
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon name="Phone" size={18} />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon name="Video" size={18} />
                </button>
                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon name="MoreVertical" size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-2 bg-background">
              {activeChat.messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-slide-up`} style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className={`max-w-[70%] px-4 py-2.5 text-sm ${msg.out ? "msg-bubble-out" : "msg-bubble-in"}`}>
                    <p>{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.out ? "justify-end" : "justify-start"}`}>
                      <span className={`text-[10px] ${msg.out ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{msg.time}</span>
                      {msg.out && (
                        <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} className="text-primary-foreground/70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <button className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                  <Icon name="Paperclip" size={18} />
                </button>
                <input
                  className="flex-1 px-4 py-2.5 text-sm bg-muted rounded-xl border-none outline-none placeholder:text-muted-foreground"
                  placeholder="Написать сообщение..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim()}
                  className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <Icon name="Send" size={16} className="text-white" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-muted-foreground select-none">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "hsl(var(--primary) / 0.1)" }}>
              <Icon name="MessageCircle" size={32} className="text-primary" />
            </div>
            <p className="font-medium text-foreground">Выберите чат</p>
            <p className="text-sm mt-1">Начните общение прямо сейчас</p>
          </div>
        )}
      </div>

      {/* Notifications panel */}
      {showNotifications && (
        <div className="absolute right-4 bottom-20 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-semibold text-sm">Уведомления</span>
            <button onClick={markAllNotifRead} className="text-xs text-primary hover:underline">Прочитать все</button>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hide">
            {notifications.map(n => (
              <div key={n.id} className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 ${n.read ? "" : "bg-primary/5"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.type === "message" ? "bg-primary/10" : "bg-emerald-500/10"}`}>
                  <Icon name={n.type === "message" ? "MessageCircle" : "UserCheck"} size={15} className={n.type === "message" ? "text-primary" : "text-emerald-500"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs leading-relaxed">{n.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}