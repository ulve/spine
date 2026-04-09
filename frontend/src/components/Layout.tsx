import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Library,
  Users,
  BookOpen,
  Tags,
  Upload,
  LogOut,
  Search,
  Menu,
  X,
  Shield,
  BookMarked,
  Layers
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NavShelf } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onSearch: (query: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, onSearch }) => {
  const { isAuthenticated, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [navShelves, setNavShelves] = useState<NavShelf[]>([]);

  useEffect(() => {
    fetch('/api/nav-shelves')
      .then(r => r.json())
      .then((data: NavShelf[]) => setNavShelves(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    onSearch(value);
  };

  const navItems = [
    { name: 'Library', path: '/', icon: Library },
    { name: 'Authors', path: '/authors', icon: Users },
    { name: 'Series', path: '/series', icon: BookOpen },
    { name: 'Tags', path: '/tags', icon: Tags },
  ];

  if (isAuthenticated && user?.isAdmin) {
    navItems.push({ name: 'Upload', path: '/upload', icon: Upload });
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  const NavLink = ({ name, path, icon: Icon }: { name: string; path: string; icon: React.ElementType }) => {
    const active = isActive(path);
    return (
      <Link
        to={path}
        className={cn(
          "flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-xl transition-all duration-200 group border-l-2",
          active
            ? "border-primary bg-primary/8 text-foreground"
            : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/4"
        )}
      >
        <Icon className={cn("w-4 h-4 transition-transform duration-200 group-hover:scale-110 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
        <span className="font-bold text-xs uppercase tracking-widest">{name}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col md:flex-row transition-colors duration-[1200ms]" style={{ backgroundColor: 'var(--shelf-tint-bg, hsl(222 30% 6%))' }}>
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 p-6 fixed h-full z-40 transition-colors duration-[1200ms]" style={{ backgroundColor: 'var(--shelf-tint-sidebar, #080d18)' }}>
        {/* Wordmark */}
        <Link to="/" className="px-3 mb-8 block">
          <span
            className="text-3xl text-foreground leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600 }}
          >
            Spine
          </span>
        </Link>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
          <input
            type="text"
            placeholder="Search..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full bg-white/4 border border-white/8 rounded-xl py-2 pl-9 pr-3 text-xs outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-muted-foreground/40"
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <NavLink key={item.name} {...item} />
          ))}

          {navShelves.length > 0 && (
            <>
              <div className="pt-5 pb-1.5 pl-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground/35 flex items-center gap-1.5">
                  <Layers className="w-2.5 h-2.5" />
                  Shelves
                </p>
              </div>
              {navShelves.map(shelf => {
                const shelfPath = `/shelf/${shelf.id}`;
                const active = location.pathname === shelfPath;
                return (
                  <Link
                    key={shelf.id}
                    to={shelfPath}
                    className={cn(
                      "flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-xl transition-all duration-200 group border-l-2",
                      active
                        ? "border-primary bg-primary/8 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/4"
                    )}
                  >
                    <BookMarked className={cn("w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110", active ? "text-primary" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="font-bold text-xs uppercase tracking-widest truncate">{shelf.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* User */}
        {isAuthenticated ? (
          <div className="pt-6 border-t border-white/5 space-y-1">
            <div className="px-3 mb-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/35 mb-0.5">Signed in as</p>
              <p className="font-bold text-sm truncate">{user?.username}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-400/8 transition-all group border-l-2 border-transparent"
            >
              <LogOut className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-xs uppercase tracking-widest">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-4 pl-3 pr-4 py-2.5 rounded-xl bg-white/4 text-foreground hover:bg-white/8 transition-all border-l-2 border-transparent"
          >
            <LogOut className="w-4 h-4 rotate-180" />
            <span className="font-bold text-xs uppercase tracking-widest">Sign In</span>
          </Link>
        )}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-[#080d18] border-b border-white/5 px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
        <Link to="/" className="block">
          <span
            className="text-2xl leading-none"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontStyle: 'italic', fontWeight: 600 }}
          >
            Spine
          </span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-muted-foreground">
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="md:hidden fixed inset-0 top-[53px] bg-[#080d18] z-40 p-5 space-y-5 overflow-y-auto"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchValue}
                onChange={handleSearchChange}
                className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-3.5 rounded-xl border-l-2",
                      isActive(item.path)
                        ? "border-primary bg-primary/8 text-foreground"
                        : "border-transparent text-muted-foreground hover:bg-white/4"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="font-bold text-sm uppercase tracking-widest">{item.name}</span>
                  </Link>
                );
              })}
              {navShelves.length > 0 && (
                <>
                  <div className="pt-3 pb-1 px-3">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Shelves</p>
                  </div>
                  {navShelves.map(shelf => {
                    const shelfPath = `/shelf/${shelf.id}`;
                    return (
                      <Link
                        key={shelf.id}
                        to={shelfPath}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3.5 rounded-xl border-l-2",
                          location.pathname === shelfPath
                            ? "border-primary bg-primary/8 text-foreground"
                            : "border-transparent text-muted-foreground hover:bg-white/4"
                        )}
                      >
                        <BookMarked className="w-4 h-4" />
                        <span className="font-bold text-sm uppercase tracking-widest">{shelf.name}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
            {isAuthenticated && (
              <button
                onClick={() => { logout(); navigate('/login'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-rose-400 border-l-2 border-transparent"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-bold text-sm uppercase tracking-widest">Sign Out</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content — no search bar here anymore */}
      <main className="flex-1 md:ml-64 p-6 md:p-10">
        {children}
      </main>
    </div>
  );
};
