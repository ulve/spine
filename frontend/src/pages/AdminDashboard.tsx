import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { NavShelf, Tag, User } from '../types';
import {
  Users,
  UserCheck,
  Shield,
  ShieldAlert,
  Calendar,
  Loader2,
  Trash2,
  Clock,
  BookMarked,
  Plus,
  Pencil,
  X,
  Image,
  Check,
} from 'lucide-react';
import { cn } from '../lib/utils';

interface ShelfFormState {
  name: string;
  tagInput: string;
  tagNames: string[];
  order: number;
}

const emptyForm = (): ShelfFormState => ({ name: '', tagInput: '', tagNames: [], order: 0 });

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Nav shelves state
  const [shelves, setShelves] = useState<NavShelf[]>([]);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showShelfForm, setShowShelfForm] = useState(false);
  const [editingShelf, setEditingShelf] = useState<NavShelf | null>(null);
  const [shelfForm, setShelfForm] = useState<ShelfFormState>(emptyForm());
  const [shelfSaving, setShelfSaving] = useState(false);
  const [bgUploading, setBgUploading] = useState<string | null>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [activeBgShelfId, setActiveBgShelfId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchShelves();
    fetchTags();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to approve user');
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, isApproved: true } : u));
    } catch (err) {
      console.error('Error approving user:', err);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete user');
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  const fetchShelves = async () => {
    setShelvesLoading(true);
    try {
      const res = await fetch('/api/nav-shelves');
      const data = await res.json();
      setShelves(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching shelves:', err);
    } finally {
      setShelvesLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await fetch('/api/tags');
      const data = await res.json();
      setAllTags(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  };

  const openCreateShelf = () => {
    setEditingShelf(null);
    setShelfForm(emptyForm());
    setShowShelfForm(true);
  };

  const openEditShelf = (shelf: NavShelf) => {
    setEditingShelf(shelf);
    setShelfForm({ name: shelf.name, tagInput: '', tagNames: shelf.tags.map(t => t.name), order: shelf.order });
    setShowShelfForm(true);
  };

  const addTag = () => {
    const tag = shelfForm.tagInput.trim();
    if (tag && !shelfForm.tagNames.includes(tag)) {
      setShelfForm(f => ({ ...f, tagNames: [...f.tagNames, tag], tagInput: '' }));
    } else {
      setShelfForm(f => ({ ...f, tagInput: '' }));
    }
  };

  const removeTag = (name: string) => {
    setShelfForm(f => ({ ...f, tagNames: f.tagNames.filter(t => t !== name) }));
  };

  const saveShelf = async () => {
    if (!shelfForm.name.trim()) return;
    setShelfSaving(true);
    try {
      const body = { name: shelfForm.name.trim(), tagNames: shelfForm.tagNames, order: shelfForm.order };
      const url = editingShelf ? `/api/nav-shelves/${editingShelf.id}` : '/api/nav-shelves';
      const method = editingShelf ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      setShowShelfForm(false);
      fetchShelves();
    } catch (err) {
      console.error('Save shelf error:', err);
    } finally {
      setShelfSaving(false);
    }
  };

  const deleteShelf = async (id: string) => {
    if (!confirm('Delete this shelf?')) return;
    try {
      await fetch(`/api/nav-shelves/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      setShelves(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Delete shelf error:', err);
    }
  };

  const uploadBackground = async (shelfId: string, file: File) => {
    setBgUploading(shelfId);
    try {
      const form = new FormData();
      form.append('background', file);
      const res = await fetch(`/api/nav-shelves/${shelfId}/background`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed');
      fetchShelves();
    } catch (err) {
      console.error('Upload bg error:', err);
    } finally {
      setBgUploading(null);
    }
  };

  if (loading && shelvesLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Loading Admin Panel...</p>
      </div>
    );
  }

  // hidden file input for bg upload
  const handleBgFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeBgShelfId) {
      uploadBackground(activeBgShelfId, file);
    }
    e.target.value = '';
    setActiveBgShelfId(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <input
        type="file"
        ref={bgInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleBgFileChange}
      />
      <div className="flex flex-col gap-2">
        <h1 className="text-5xl font-black tracking-tighter uppercase italic flex items-center gap-4">
          <Shield className="w-12 h-12 text-primary" />
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground font-medium">Manage user access and permissions</p>
      </div>

      <div className="bg-secondary/30 border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/50 flex items-center gap-3">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-black uppercase tracking-widest text-sm">Registered Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Registered</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black uppercase">
                        {user.username.charAt(0)}
                      </div>
                      <span className="font-bold">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.isApproved ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold bg-emerald-400/10 px-3 py-1 rounded-full w-fit border border-emerald-400/20">
                        <UserCheck className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-amber-400 text-xs font-bold bg-amber-400/10 px-3 py-1 rounded-full w-fit border border-amber-400/20">
                        <Clock className="w-3.5 h-3.5" />
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {user.isAdmin ? (
                      <span className="flex items-center gap-1.5 text-primary text-xs font-bold bg-primary/10 px-3 py-1 rounded-full w-fit border border-primary/20">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs font-bold">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!user.isApproved && (
                        <button
                          onClick={() => approveUser(user.id)}
                          className="bg-emerald-500 text-white px-4 py-1.5 rounded-xl text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                        >
                          Approve
                        </button>
                      )}
                      {!user.isAdmin && (
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NAV SHELVES MANAGEMENT */}
      <div className="bg-secondary/30 border border-border rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-border bg-secondary/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BookMarked className="w-5 h-5 text-primary" />
            <h2 className="font-black uppercase tracking-widest text-sm">Navigation Shelves</h2>
          </div>
          <button
            onClick={openCreateShelf}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-3.5 h-3.5" />
            New Shelf
          </button>
        </div>

        {/* Shelf form */}
        {showShelfForm && (
          <div className="p-6 border-b border-border bg-secondary/20 space-y-4">
            <h3 className="font-black uppercase tracking-widest text-xs text-muted-foreground">
              {editingShelf ? 'Edit Shelf' : 'Create Shelf'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Name</label>
                <input
                  type="text"
                  value={shelfForm.name}
                  onChange={e => setShelfForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Warhammer"
                  className="w-full bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Nav Order</label>
                <input
                  type="number"
                  value={shelfForm.order}
                  onChange={e => setShelfForm(f => ({ ...f, order: Number(e.target.value) }))}
                  className="w-full bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Tags (books with any of these tags appear on the shelf)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shelfForm.tagInput}
                  onChange={e => setShelfForm(f => ({ ...f, tagInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="Tag name..."
                  list="tag-suggestions"
                  className="flex-1 bg-background/50 border border-white/10 rounded-xl py-2.5 px-4 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                />
                <datalist id="tag-suggestions">
                  {allTags.filter(t => !shelfForm.tagNames.includes(t.name)).map(t => (
                    <option key={t.id} value={t.name} />
                  ))}
                </datalist>
                <button onClick={addTag} className="bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-xl text-xs font-black hover:bg-primary/20 transition-all">
                  Add
                </button>
              </div>
              {shelfForm.tagNames.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {shelfForm.tagNames.map(name => (
                    <span key={name} className="flex items-center gap-1.5 text-xs font-bold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
                      {name}
                      <button onClick={() => removeTag(name)} className="hover:text-rose-400 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={saveShelf}
                disabled={shelfSaving || !shelfForm.name.trim()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-xl text-xs font-black hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {shelfSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {editingShelf ? 'Save Changes' : 'Create'}
              </button>
              <button
                onClick={() => setShowShelfForm(false)}
                className="px-6 py-2.5 rounded-xl text-xs font-black text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Shelf list */}
        {shelvesLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : shelves.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs font-black uppercase tracking-widest">
            No shelves yet — create one to get started
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {shelves.map(shelf => (
              <div key={shelf.id} className="p-5 flex items-start gap-4 hover:bg-white/5 transition-colors group">
                {/* Background preview */}
                <div
                  className="w-16 h-16 rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10 relative cursor-pointer"
                  style={shelf.backgroundImage ? { backgroundImage: `url(/api/shelf-backgrounds/${shelf.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: 'linear-gradient(135deg, #1a1f35, #0f1626)' }}
                  onClick={() => { setActiveBgShelfId(shelf.id); bgInputRef.current?.click(); }}
                  title="Click to upload background image"
                >
                  {bgUploading === shelf.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-white" />
                  ) : (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Image className="w-5 h-5 text-white" />
                    </div>
                  )}
                  {!shelf.backgroundImage && <BookMarked className="w-6 h-6 text-primary/50" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-black uppercase tracking-widest text-sm">{shelf.name}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {shelf.tags.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground/60 italic">No tags</span>
                    ) : shelf.tags.map(tag => (
                      <span key={tag.id} className="text-[10px] font-bold bg-white/5 border border-white/10 text-muted-foreground px-2 py-0.5 rounded-full">
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditShelf(shelf)} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteShelf(shelf.id)} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
