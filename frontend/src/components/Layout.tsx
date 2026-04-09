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
  }

  if (isAuthenticated && user?.isAdmin) {
    navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-[#0F1626] border-r border-white/5 p-8 fixed h-full z-40">
        <Link to="/" className="flex items-center gap-3 px-2 mb-12">
          <span className="text-2xl font-black tracking-tighter uppercase italic text-foreground">Spine</span>
        </Link>

        <nav className="flex-1 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                  isActive(item.path)
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                )}
              >
                <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive(item.path) ? "text-primary-foreground" : "text-primary")} />
                <span className="font-bold text-sm uppercase tracking-widest">{item.name}</span>
              </Link>
            );
          })}

          {navShelves.length > 0 && (
            <>
              <div className="pt-4 pb-1 px-4">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 flex items-center gap-2">
                  <Layers className="w-3 h-3" />
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
                      "flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group",
                      active
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    <BookMarked className={cn("w-5 h-5 transition-transform group-hover:scale-110", active ? "text-primary-foreground" : "text-primary")} />
                    <span className="font-bold text-sm uppercase tracking-widest truncate">{shelf.name}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {isAuthenticated ? (
          <div className="pt-8 border-t border-white/5 space-y-4">
            <div className="px-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 mb-1">Signed in as</p>
              <p className="font-bold text-sm truncate">{user?.username}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-rose-400 hover:bg-rose-400/10 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span className="font-bold text-sm uppercase tracking-widest">Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-white/5 text-foreground hover:bg-white/10 transition-all"
          >
            <LogOut className="w-5 h-5 rotate-180" />
            <span className="font-bold text-sm uppercase tracking-widest">Sign In</span>
          </Link>
        )}
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-[#0F1626] border-b border-white/5 p-4 sticky top-0 z-50 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-lg font-black tracking-tighter uppercase italic">Spine</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-muted-foreground">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-0 top-[65px] bg-[#0F1626] z-40 p-6 space-y-6"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search library..."
                value={searchValue}
                onChange={handleSearchChange}
                className="w-full bg-background/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <nav className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-4 px-4 py-4 rounded-2xl",
                      isActive(item.path) ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-bold uppercase tracking-widest">{item.name}</span>
                  </Link>
                );
              })}
              {navShelves.length > 0 && (
                <>
                  <div className="pt-2 pb-1 px-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">Shelves</p>
                  </div>
                  {navShelves.map(shelf => {
                    const shelfPath = `/shelf/${shelf.id}`;
                    return (
                      <Link
                        key={shelf.id}
                        to={shelfPath}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-4 rounded-2xl",
                          location.pathname === shelfPath ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-white/5"
                        )}
                      >
                        <BookMarked className="w-5 h-5" />
                        <span className="font-bold uppercase tracking-widest">{shelf.name}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>
            {isAuthenticated && (
              <button
                onClick={() => { logout(); navigate('/login'); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-rose-400 bg-rose-400/5"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-bold uppercase tracking-widest">Sign Out</span>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 md:ml-72 p-6 md:p-12">
        {/* Search Bar - Desktop */}
        <div className="hidden md:block relative max-w-2xl mb-12">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search books, authors, or series..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full bg-[#0F1626] border border-white/5 rounded-3xl py-4 pl-16 pr-6 text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-2xl"
          />
        </div>

        {children}
      </main>
    </div>
  );
};
