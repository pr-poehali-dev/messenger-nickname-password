import { useState, useRef, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const AUTH_URL = "https://functions.poehali.dev/e2057fd0-b6bf-44f9-bf49-98f5182a5a37";
const MSG_URL = "https://functions.poehali.dev/8c0966b7-1b32-49ee-a6ce-f1d1ebeaf47b";

const TOKEN_KEY = "waves_token";
const USER_KEY = "waves_user";

async function apiAuth(action: string, body?: object) {
  const res = await fetch(`${AUTH_URL}/?action=${action}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.json();
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
}

async function apiMsg(action: string, token: string, body?: object, extraParams?: Record<string, string>) {
  const params = new URLSearchParams({ action, ...(extraParams || {}) });
  const res = await fetch(`${MSG_URL}/?${params}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Auth-Token": token },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.json();
  const data = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!res.ok) throw new Error(data.error || "Ошибка");
  return data;
}

function formatTime(isoStr: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (isYesterday) return "Вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

function formatTimeFull(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

interface AuthUser { id: number; username: string; token: string; }
interface RealMessage { id: number; from_me: boolean; text: string; time: string; is_read: boolean; }
interface RealChat { id: number; username: string; last_seen: string | null; last_msg: string; last_time: string | null; last_from_me: boolean; unread_count: number; }
interface RealUser { id: number; username: string; last_seen: string; }

type Tab = "chats" | "contacts" | "search" | "profile" | "settings";
type Theme = "light" | "dark";

const AVATAR_COLORS = ["bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500","bg-rose-500","bg-cyan-500","bg-amber-500"];
function getColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ name, size = "md", online }: { name: string; size?: "sm" | "md" | "lg"; online?: boolean }) {
  const sz = size === "sm" ? "w-9 h-9 text-xs" : size === "lg" ? "w-14 h-14 text-lg" : "w-11 h-11 text-sm";
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div className="relative shrink-0">
      <div className={`${sz} ${getColor(name)} rounded-full flex items-center justify-center font-semibold text-white`}>
        {initials}
      </div>
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background ${online ? "bg-emerald-400" : "bg-muted-foreground/40"}`} />
      )}
    </div>
  );
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
          <p className="text-sm text-muted-foreground mt-1">{mode === "login" ? "Вход в аккаунт" : "Создать аккаунт"}</p>
        </div>
        <form onSubmit={submit} className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ник</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="минимум 3 символа"
              className="w-full px-4 py-2.5 text-sm bg-muted rounded-xl outline-none border border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground"
              autoComplete="username" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Пароль</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="минимум 4 символа"
              className="w-full px-4 py-2.5 text-sm bg-muted rounded-xl outline-none border border-transparent focus:border-primary transition-colors placeholder:text-muted-foreground"
              autoComplete={mode === "register" ? "new-password" : "current-password"} required />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-xl px-3 py-2">
              <Icon name="AlertCircle" size={15} /><span>{error}</span>
            </div>
          )}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-60"
            style={{ background: "hsl(var(--primary))" }}>
            {loading ? "Загрузка..." : mode === "login" ? "Войти" : "Зарегистрироваться"}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
          <button onClick={() => { setMode(m => m === "login" ? "register" : "login"); setError(""); }}
            className="text-primary font-medium hover:underline">
            {mode === "login" ? "Зарегистрироваться" : "Войти"}
          </button>
        </p>
      </div>
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
  const [chats, setChats] = useState<RealChat[]>([]);
  const [allUsers, setAllUsers] = useState<RealUser[]>([]);
  const [activeChat, setActiveChat] = useState<RealChat | null>(null);
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalUnread = chats.reduce((s, c) => s + Number(c.unread_count), 0);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const loadChats = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await apiMsg("chats", authUser.token);
      setChats(data.chats || []);
    } catch { /* silent */ }
  }, [authUser]);

  const loadUsers = useCallback(async () => {
    if (!authUser) return;
    try {
      const data = await apiMsg("users", authUser.token);
      setAllUsers(data.users || []);
    } catch { /* silent */ }
  }, [authUser]);

  useEffect(() => {
    if (!authUser) return;
    setLoadingChats(true);
    Promise.all([loadChats(), loadUsers()]).finally(() => setLoadingChats(false));
  }, [authUser, loadChats, loadUsers]);

  // Polling каждые 3 секунды
  useEffect(() => {
    if (!authUser) return;
    pollRef.current = setInterval(() => {
      loadChats();
      if (activeChat) loadHistory(activeChat.id, false);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [authUser, activeChat, loadChats]);

  async function loadHistory(partnerId: number, showLoader = true) {
    if (!authUser) return;
    if (showLoader) setLoadingMsgs(true);
    try {
      const data = await apiMsg("history", authUser.token, undefined, { with_user_id: String(partnerId) });
      setMessages(data.messages || []);
      // Mark as read
      apiMsg("mark_read", authUser.token, {}, { with_user_id: String(partnerId) }).catch(() => {});
    } catch { /* silent */ } finally {
      if (showLoader) setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openChat(chat: RealChat) {
    setActiveChat(chat);
    setTab("chats");
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
    await loadHistory(chat.id);
  }

  async function openChatWithUser(user: RealUser) {
    const existing = chats.find(c => c.id === user.id);
    if (existing) {
      openChat(existing);
    } else {
      const fakeChat: RealChat = {
        id: user.id, username: user.username, last_seen: user.last_seen,
        last_msg: "", last_time: null, last_from_me: false, unread_count: 0,
      };
      setActiveChat(fakeChat);
      setMessages([]);
      setTab("chats");
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !activeChat || !authUser) return;
    const text = inputText.trim();
    setInputText("");
    setSendingMsg(true);
    try {
      const data = await apiMsg("send", authUser.token, { to_user_id: activeChat.id, text });
      const newMsg: RealMessage = { id: data.id, from_me: true, text, time: data.time, is_read: false };
      setMessages(prev => [...prev, newMsg]);
      setChats(prev => {
        const exists = prev.find(c => c.id === activeChat.id);
        if (exists) {
          return prev.map(c => c.id === activeChat.id ? { ...c, last_msg: text, last_time: data.time, last_from_me: true } : c);
        }
        return [{ ...activeChat, last_msg: text, last_time: data.time, last_from_me: true }, ...prev];
      });
    } catch { /* silent */ } finally {
      setSendingMsg(false);
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthUser(null);
  }

  const filteredChats = chats.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredUsers = allUsers.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  const navItems: { id: Tab; icon: string; label: string; badge?: number }[] = [
    { id: "chats", icon: "MessageCircle", label: "Чаты", badge: totalUnread },
    { id: "contacts", icon: "Users", label: "Контакты" },
    { id: "search", icon: "Search", label: "Поиск" },
    { id: "profile", icon: "User", label: "Профиль" },
    { id: "settings", icon: "Settings", label: "Настройки" },
  ];

  if (!authUser) return <AuthScreen onAuth={setAuthUser} />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar nav */}
      <aside className="flex flex-col items-center py-6 px-2 gap-1 border-r border-border bg-card w-16 shrink-0">
        <div className="mb-6 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "hsl(var(--primary))" }}>
          <Icon name="Waves" size={18} className="text-white" />
        </div>
        {navItems.map(item => (
          <button key={item.id}
            onClick={() => { setTab(item.id); setActiveChat(null); }}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${tab === item.id ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title={item.label}>
            <Icon name={item.icon} size={20} />
            {item.badge ? (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-0.5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        ))}
        <div className="mt-auto flex flex-col gap-1">
          <button onClick={() => setShowNotifications(v => !v)}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
              ${showNotifications ? "bg-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
            title="Уведомления">
            <Icon name="Bell" size={20} />
            {totalUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold rounded-full bg-rose-500 text-white flex items-center justify-center animate-pulse-dot">
                {totalUnread}
              </span>
            )}
          </button>
          <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
            title="Сменить тему">
            <Icon name={theme === "light" ? "Moon" : "Sun"} size={20} />
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column */}
        <div className={`flex flex-col border-r border-border bg-background ${activeChat ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0`}>

          {/* CHATS */}
          {tab === "chats" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Чаты</h1>
                <div className="mt-3 relative">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-xl outline-none placeholder:text-muted-foreground"
                    placeholder="Поиск чатов..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {loadingChats && chats.length === 0 && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Icon name="Loader" size={20} className="animate-spin mr-2" />
                    <span className="text-sm">Загрузка...</span>
                  </div>
                )}
                {!loadingChats && chats.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground px-4 text-center">
                    <Icon name="MessageCircle" size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">Нет чатов</p>
                    <p className="text-xs mt-1">Найдите пользователей во вкладке «Контакты»</p>
                  </div>
                )}
                {filteredChats.map(chat => (
                  <button key={chat.id} onClick={() => openChat(chat)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left
                      ${activeChat?.id === chat.id ? "bg-accent/50" : ""}`}>
                    <Avatar name={chat.username} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">@{chat.username}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">{formatTime(chat.last_time)}</span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs text-muted-foreground truncate">
                          {chat.last_from_me && <span className="text-primary">Вы: </span>}{chat.last_msg || "Нет сообщений"}
                        </span>
                        {chat.unread_count > 0 && (
                          <span className="ml-2 shrink-0 min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CONTACTS */}
          {tab === "contacts" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Контакты</h1>
                <p className="text-xs text-muted-foreground mt-1">{allUsers.length} пользователей</p>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide">
                {allUsers.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Icon name="Users" size={36} className="mb-3 opacity-20" />
                    <p className="text-sm">Нет других пользователей</p>
                  </div>
                )}
                {allUsers.map(user => (
                  <button key={user.id} onClick={() => openChatWithUser(user)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                    <Avatar name={user.username} />
                    <div>
                      <div className="font-medium text-sm">@{user.username}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatTime(user.last_seen) ? `был в ${formatTime(user.last_seen)}` : ""}
                      </div>
                    </div>
                    <Icon name="MessageCircle" size={16} className="ml-auto text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH */}
          {tab === "search" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3">
                <h1 className="text-xl font-semibold">Поиск</h1>
                <div className="mt-3 relative">
                  <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input autoFocus
                    className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-xl outline-none placeholder:text-muted-foreground"
                    placeholder="Поиск пользователей..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
              </div>
              {searchQuery.length > 0 ? (
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {filteredChats.length > 0 && (
                    <>
                      <div className="px-4 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Чаты</div>
                      {filteredChats.map(c => (
                        <button key={c.id} onClick={() => openChat(c)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                          <Avatar name={c.username} />
                          <div>
                            <div className="font-medium text-sm">@{c.username}</div>
                            <div className="text-xs text-muted-foreground truncate">{c.last_msg}</div>
                          </div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredUsers.filter(u => !chats.find(c => c.id === u.id)).length > 0 && (
                    <>
                      <div className="px-4 mt-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Пользователи</div>
                      {filteredUsers.filter(u => !chats.find(c => c.id === u.id)).map(u => (
                        <button key={u.id} onClick={() => openChatWithUser(u)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                          <Avatar name={u.username} />
                          <div className="font-medium text-sm">@{u.username}</div>
                        </button>
                      ))}
                    </>
                  )}
                  {filteredChats.length === 0 && filteredUsers.length === 0 && (
                    <div className="px-4 py-8 text-center text-muted-foreground text-sm">Ничего не найдено</div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Icon name="Search" size={40} className="mb-3 opacity-20" />
                  <p className="text-sm">Введите ник пользователя</p>
                </div>
              )}
            </div>
          )}

          {/* PROFILE */}
          {tab === "profile" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3"><h1 className="text-xl font-semibold">Профиль</h1></div>
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
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Icon name="AtSign" size={18} className="text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Ник</div>
                      <div className="text-sm font-medium">@{authUser.username}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
                    <Icon name="MessageCircle" size={18} className="text-primary shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Чатов</div>
                      <div className="text-sm font-medium">{chats.length}</div>
                    </div>
                  </div>
                </div>
                <button onClick={logout}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
                  Выйти из аккаунта
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <div className="flex flex-col h-full animate-fade-in">
              <div className="px-4 pt-5 pb-3"><h1 className="text-xl font-semibold">Настройки</h1></div>
              <div className="flex-1 overflow-y-auto scrollbar-hide px-4 space-y-2 pb-4">
                {[
                  { icon: "Bell", label: "Уведомления", desc: "Звуки и оповещения" },
                  { icon: "Shield", label: "Конфиденциальность", desc: "Кто видит ваши данные" },
                  { icon: "Palette", label: "Оформление", desc: "Тема и шрифты" },
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
                    <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${theme === "dark" ? "bg-primary" : "bg-muted-foreground/30"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${theme === "dark" ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                </div>
                <button onClick={logout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-destructive/10 transition-colors text-left">
                  <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                    <Icon name="LogOut" size={18} className="text-destructive" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-destructive">Выйти</div>
                    <div className="text-xs text-muted-foreground">Завершить сеанс</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Chat window */}
        {activeChat ? (
          <div className="flex flex-col flex-1 animate-fade-in">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
              <button onClick={() => setActiveChat(null)} className="md:hidden mr-1 text-muted-foreground hover:text-foreground">
                <Icon name="ArrowLeft" size={20} />
              </button>
              <Avatar name={activeChat.username} />
              <div>
                <div className="font-semibold text-sm">@{activeChat.username}</div>
                <div className="text-xs text-muted-foreground">
                  {activeChat.last_seen ? `был в ${formatTime(activeChat.last_seen)}` : ""}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-5 py-4 space-y-2 bg-background">
              {loadingMsgs && (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Icon name="Loader" size={18} className="animate-spin mr-2" />
                  <span className="text-sm">Загрузка...</span>
                </div>
              )}
              {!loadingMsgs && messages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Icon name="MessageCircle" size={36} className="mb-3 opacity-20" />
                  <p className="text-sm">Начните общение!</p>
                  <p className="text-xs mt-1">Напишите первое сообщение</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.from_me ? "justify-end" : "justify-start"} animate-slide-up`}
                  style={{ animationDelay: `${Math.min(i * 0.02, 0.3)}s` }}>
                  <div className={`max-w-[70%] px-4 py-2.5 text-sm ${msg.from_me ? "msg-bubble-out" : "msg-bubble-in"}`}>
                    <p style={{ wordBreak: "break-word" }}>{msg.text}</p>
                    <div className={`flex items-center gap-1 mt-1 ${msg.from_me ? "justify-end" : "justify-start"}`}>
                      <span className={`text-[10px] ${msg.from_me ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTimeFull(msg.time)}
                      </span>
                      {msg.from_me && (
                        <Icon name={msg.is_read ? "CheckCheck" : "Check"} size={12} className="text-primary-foreground/70" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-3 border-t border-border bg-card">
              <div className="flex items-center gap-2">
                <input
                  className="flex-1 px-4 py-2.5 text-sm bg-muted rounded-xl border-none outline-none placeholder:text-muted-foreground"
                  placeholder="Написать сообщение..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!inputText.trim() || sendingMsg}
                  className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-40"
                  style={{ background: "hsl(var(--primary))" }}>
                  {sendingMsg
                    ? <Icon name="Loader" size={16} className="text-white animate-spin" />
                    : <Icon name="Send" size={16} className="text-white" />}
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
            <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
              <Icon name="X" size={16} />
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto scrollbar-hide">
            {chats.filter(c => c.unread_count > 0).length === 0 ? (
              <div className="px-4 py-8 text-center text-muted-foreground text-sm">Нет новых уведомлений</div>
            ) : (
              chats.filter(c => c.unread_count > 0).map(c => (
                <button key={c.id} onClick={() => { openChat(c); setShowNotifications(false); }}
                  className="w-full flex items-start gap-3 px-4 py-3 border-b border-border/50 last:border-0 bg-primary/5 hover:bg-primary/10 transition-colors text-left">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon name="MessageCircle" size={15} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">@{c.username}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.last_msg}</p>
                  </div>
                  <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                    {c.unread_count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
