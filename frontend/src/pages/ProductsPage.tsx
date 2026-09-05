import React, { useState, useEffect } from 'react';
import { productsApi } from '../services/api';
import { Product, ProductCategory } from '../types';
import { Package, Search, Filter, Percent, DollarSign, Layers } from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const list = await productsApi.list(selectedCategory || undefined);
        setProducts(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [selectedCategory]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Catalog & Pricing Rules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Global catalog with predefined margin targets, category discount ceilings, and billing cadence rules.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center space-x-2 flex-1 max-w-md bg-slate-50 border border-slate-300 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-900 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['', 'HARDWARE', 'SERVICE', 'SUBSCRIPTION'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === '' ? 'All Categories' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((p) => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start mb-3">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  p.category === 'HARDWARE'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : p.category === 'SERVICE'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-purple-50 text-purple-700 border border-purple-200'
                }`}
              >
                {p.category}
              </span>
              {p.billingCycle && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {p.billingCycle}
                </span>
              )}
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">{p.name}</h3>
            <p className="text-2xl font-black text-slate-900 mb-4">${p.unitPrice.toFixed(2)}</p>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Standard Margin</span>
                <span className="font-bold text-slate-800">{p.marginPercent}%</span>
              </div>
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-200">
                <span className="text-amber-800 block text-[10px] uppercase font-bold">Discount Ceiling</span>
                <span className="font-bold text-amber-900">Max {p.discountCeiling}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
