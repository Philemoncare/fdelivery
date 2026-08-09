import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Edit3, Trash2, UtensilsCrossed, MoreHorizontal, X, Image as ImageIcon, Tag, DollarSign, Hash, Layers, Timer, Camera, Upload } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { useApp } from '@/src/context/AppContext';
import { useAuth } from '@/src/lib/auth/auth-store';
import { cn } from '@/src/lib/utils';

interface MealForm {
  title: string; price: string; stock: string; category: string; description: string; image: string; prepTime: string;
}

const initialForm: MealForm = { title: '', price: '', stock: '', category: '', description: '', image: '', prepTime: '' };

export function VendorProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, formatPrice, vendors, categories } = useApp();
  const { vendorId } = useAuth();

  // Strict vendor isolation
  const currentVendorId = vendorId || 'unknown';
  const vendorProducts = products.filter(p => p.vendorId === currentVendorId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MealForm>(initialForm);

  const filtered = vendorProducts.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!showAddModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showAddModal]);

  const handleSave = () => {
    const mealData = {
      title: form.title,
      description: form.description,
      vendorId: currentVendorId,
      vendorName: vendors.find(v => v.id === currentVendorId)?.name || 'My Kitchen',
      vendorLogo: vendors.find(v => v.id === currentVendorId)?.logo || '',
      price: parseFloat(form.price),
      rating: 4.5,
      reviewsCount: 0,
      category: form.category,
      images: form.image ? [form.image] : [],
      tags: ['New'],
      stock: parseInt(form.stock),
      prepTime: form.prepTime,
    };

    if (editingId) {
      updateProduct(editingId, mealData);
    } else {
      addProduct(mealData);
    }
    setShowAddModal(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleEdit = (product: any) => {
    setEditingId(product.id);
    setForm({
      title: product.title,
      price: product.price.toString(),
      stock: product.stock.toString(),
      category: product.category,
      description: product.description || '',
      image: product.images[0],
      prepTime: product.prepTime || '20 min'
    });
    setShowAddModal(true);
  };

  const pickMealImage = (capture: boolean = false) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (capture) (input as any).capture = 'environment';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX = 1200; // Increased resolution slightly for better quality
          if (width > height) {
            if (width > MAX) { height *= MAX / width; width = MAX; }
          } else {
            if (height > MAX) { width *= MAX / height; height = MAX; }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const base64 = canvas.toDataURL('image/jpeg', 0.8); // Better quality
          setForm(f => ({ ...f, image: base64 }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const stats = [
    { label: 'Total Meals', value: vendorProducts.length, change: 'Active on menu', icon: UtensilsCrossed },
    { label: 'In Stock', value: vendorProducts.filter(p => p.stock > 0).length, change: 'Available now', icon: Tag },
    { label: 'Low Stock', value: vendorProducts.filter(p => p.stock < 10 && p.stock > 0).length, change: 'Needs restock', icon: Layers },
    { label: 'Out of Stock', value: vendorProducts.filter(p => p.stock === 0).length, change: 'Hidden from app', icon: X },
  ];

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">Create, edit and manage availability of your Ghanaian dishes.</p>
        </div>
        <Button className="rounded-xl bg-purple-600 hover:bg-purple-700 h-12 px-6 font-bold shadow-lg shadow-purple-600/20" onClick={() => { setEditingId(null); setForm(initialForm); setShowAddModal(true); }}>
          <Plus className="w-5 h-5 mr-2" /> Add New Meal
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="rounded-[1.5rem] border-gray-100 dark:border-slate-800 shadow-sm">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-slate-800/50 text-purple-500">
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1.5">{s.label}</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white leading-none">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="rounded-[2rem] border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <CardHeader className="p-6 border-b border-gray-50 dark:border-slate-800 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="flex items-center gap-2 flex-1 bg-gray-50 dark:bg-slate-900 rounded-xl px-4 py-2.5 border border-gray-100 dark:border-slate-800">
              <Search className="w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search menu..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold flex-1 text-gray-700 dark:text-gray-300" />
            </div>
          </div>
          <Badge variant="brand" className="px-3 py-1 text-[10px] font-black uppercase tracking-widest">{filtered.length} DISHES</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                  <th className="px-6 py-4">Meal</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Availability</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {filtered.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={product.images[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80'} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white leading-tight">{product.title}</p>
                          <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1 mt-1"><Timer className="w-3 h-3" /> {product.prepTime}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500 uppercase text-[10px] tracking-widest">{product.category}</td>
                    <td className="px-6 py-4 font-black text-gray-900 dark:text-white">{formatPrice(product.price)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full", product.stock > 10 ? "bg-emerald-500" : product.stock > 0 ? "bg-amber-500" : "bg-rose-500")} />
                        <span className="font-bold text-xs">{product.stock} portions</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'danger'} className="text-[9px] font-black uppercase px-2">
                        {product.stock > 10 ? 'AVAILABLE' : product.stock > 0 ? 'LOW STOCK' : 'SOLD OUT'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(product)} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 text-gray-400 hover:text-purple-600 transition-all border border-transparent hover:border-purple-100"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => deleteProduct(product.id)} className="p-2 rounded-lg bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/20 text-gray-400 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-8 border-b border-gray-50 dark:border-slate-800">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingId ? 'Edit Meal' : 'Add New Meal'}</h3>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">DISH INFORMATION & INVENTORY</p>
                </div>
                <button onClick={() => setShowAddModal(false)} className="p-2 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-400 hover:text-rose-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 space-y-6 overflow-y-auto flex-1">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Name</label>
                    <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Banku & Tilapia" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Category</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all">
                      <option value="">Select Category</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Price (GHS)</label>
                    <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}
                      placeholder="0.00" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Daily Stock</label>
                    <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                      placeholder="e.g. 50" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prep Time</label>
                    <input type="text" value={form.prepTime} onChange={e => setForm({ ...form, prepTime: e.target.value })}
                      placeholder="e.g. 25 min" className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    rows={3} placeholder="Describe the ingredients and spice level..."
className="w-full resize-y bg-gray-50 dark:bg-slate-800 border-2 border-transparent p-4 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:border-purple-500/50 outline-none transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Meal Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-slate-800/50">
                      {form.image ? (
                        <img src={form.image} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => pickMealImage(true)}>
                          <Camera className="w-4 h-4 mr-1" /> TAKE PHOTO
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl text-[10px] font-black" onClick={() => pickMealImage(false)}>
                          <Upload className="w-4 h-4 mr-1" /> UPLOAD FROM DEVICE
                        </Button>
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">On mobile you will be asked for camera / gallery permission. Uploaded photos are compressed automatically.</p>
                      {form.image && (
                        <button onClick={() => setForm({ ...form, image: '' })} className="text-[10px] font-black text-rose-500 hover:underline uppercase tracking-widest">Remove photo</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-50 dark:border-slate-800 flex gap-4 bg-gray-50/50 dark:bg-slate-950/20">
                <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest" onClick={() => setShowAddModal(false)}>CANCEL</Button>
                <Button className="flex-1 rounded-2xl h-14 bg-purple-600 hover:bg-purple-700 font-black uppercase tracking-widest shadow-xl shadow-purple-600/20" onClick={handleSave}>
                  {editingId ? 'UPDATE MEAL' : 'ADD TO MENU'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
