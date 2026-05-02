const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'apps/web/app/AdminSide/AdminInventory.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add Trash icon to import
content = content.replace(
  "import { Search, Filter, ChevronDown, Trash2, ChevronLeft, ChevronRight, X, Plus, Pencil, Upload, AlertCircle } from 'lucide-react';",
  "import { Search, Filter, ChevronDown, Trash2, ChevronLeft, ChevronRight, X, Plus, Pencil, Upload, AlertCircle, Trash } from 'lucide-react';"
);

// 2. Change Type
content = content.replace(
  "type Variation = { id?: string; type: string; name: string; price: string; cost: string; stock: string };",
  "type VariationGroup = { section: string, variations: { name: string, price: string, cost: string, stock: string }[] };"
);

// 3. Change states
content = content.replace(
  "const [newDeviceVariations, setNewDeviceVariations] = useState<Variation[]>([]);",
  "const [newDeviceVariations, setNewDeviceVariations] = useState<VariationGroup[]>([]);"
);
content = content.replace(
  "const [editDeviceVariations, setEditDeviceVariations] = useState<Variation[]>([]);",
  "const [editDeviceVariations, setEditDeviceVariations] = useState<VariationGroup[]>([]);"
);

// 4. Update fetchProducts mapping
content = content.replace(
  "variations: device.variations || []",
  `variations: device.variations ? Object.values(device.variations.reduce((acc: any, v: any) => {
              if (!acc[v.type]) acc[v.type] = { section: v.type, variations: [] };
              acc[v.type].variations.push({ name: v.name, price: v.price?.toString() || '0', cost: v.cost?.toString() || '0', stock: v.stock?.toString() || '0' });
              return acc;
            }, {})) : []`
);

// 5. Update handleAddProduct append
content = content.replace(
  `    if (newDeviceVariations.length > 0) {
      formData.append('variations', JSON.stringify(newDeviceVariations));
    }`,
  `    if (newDeviceVariations.length > 0) {
      const flattened = newDeviceVariations.flatMap(group =>
        group.variations.map(v => ({ type: group.section, ...v }))
      );
      formData.append('variations', JSON.stringify(flattened));
    }`
);

// 6. Update handleEditSubmit append
content = content.replace(
  `    if (editDeviceVariations.length > 0) {
      formData.append('variations', JSON.stringify(editDeviceVariations));
    } else {
      formData.append('variations', JSON.stringify([])); // Explicitly send empty array to clear variations if all removed
    }`,
  `    if (editDeviceVariations.length > 0) {
      const flattened = editDeviceVariations.flatMap(group =>
        group.variations.map(v => ({ type: group.section, ...v }))
      );
      formData.append('variations', JSON.stringify(flattened));
    } else {
      formData.append('variations', JSON.stringify([])); // Explicitly send empty array to clear variations if all removed
    }`
);

// 7. Replace Add Modal Variations UI
const newUi = `                {/* Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-bold text-[#444]">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button type="button" onClick={() => setNewDeviceVariations([...newDeviceVariations, { section: '', variations: [{ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' }] }])} className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1">
                      <Plus size={14} /> Add Section
                    </button>
                  </div>
                  {newDeviceVariations.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {newDeviceVariations.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input type="text" value={group.section} onChange={e => {
                              const updated = [...newDeviceVariations];
                              if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                              setNewDeviceVariations(updated);
                            }} className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]" placeholder="e.g. Color" />
                            <div className="flex-1"></div>
                            <button type="button" onClick={() => {
                              const updated = newDeviceVariations.filter((_, i) => i !== groupIdx);
                              setNewDeviceVariations(updated);
                            }} className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm" title="Remove Section"><Trash size={14} /></button>
                          </div>
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group.variations.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v.name} onChange={e => {
                                    const updated = [...newDeviceVariations];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setNewDeviceVariations(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[60%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost</label>
                                    <input type="number" step="0.01" value={v.cost} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].cost = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Cost" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v.stock} onChange={e => {
                                      const updated = [...newDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setNewDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const updated = [...newDeviceVariations];
                                  if (updated[groupIdx]) {
                                    updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                    setNewDeviceVariations(updated);
                                  }
                                }} className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"><X size={14} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const updated = [...newDeviceVariations];
                              if (updated[groupIdx]) {
                                updated[groupIdx].variations.push({ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' });
                                setNewDeviceVariations(updated);
                              }
                            }} className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"><Plus size={12} /> Add Variation</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>`;

const editUi = `                {/* Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center px-1">
                    <label className="block text-sm font-bold text-[#444]">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button type="button" onClick={() => setEditDeviceVariations([...editDeviceVariations, { section: '', variations: [{ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' }] }])} className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1">
                      <Plus size={14} /> Add Section
                    </button>
                  </div>
                  {editDeviceVariations.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {editDeviceVariations.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input type="text" value={group.section} onChange={e => {
                              const updated = [...editDeviceVariations];
                              if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                              setEditDeviceVariations(updated);
                            }} className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]" placeholder="e.g. Color" />
                            <div className="flex-1"></div>
                            <button type="button" onClick={() => {
                              const updated = editDeviceVariations.filter((_, i) => i !== groupIdx);
                              setEditDeviceVariations(updated);
                            }} className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm" title="Remove Section"><Trash size={14} /></button>
                          </div>
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group.variations.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v.name} onChange={e => {
                                    const updated = [...editDeviceVariations];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setEditDeviceVariations(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[60%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Cost</label>
                                    <input type="number" step="0.01" value={v.cost} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].cost = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Cost" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v.stock} onChange={e => {
                                      const updated = [...editDeviceVariations];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setEditDeviceVariations(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button type="button" onClick={() => {
                                  const updated = [...editDeviceVariations];
                                  if (updated[groupIdx]) {
                                    updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                    setEditDeviceVariations(updated);
                                  }
                                }} className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"><X size={14} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => {
                              const updated = [...editDeviceVariations];
                              if (updated[groupIdx]) {
                                updated[groupIdx].variations.push({ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' });
                                setEditDeviceVariations(updated);
                              }
                            }} className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"><Plus size={12} /> Add Variation</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>`;

const oldAddUiRegex = /\{\/\* Variations Section \*\/\}\s*<div className="flex flex-col gap-3 mt-2">[\s\S]*?\{newDeviceVariations\.length === 0 && \([\s\S]*?No variations added yet\.<\/div>\s*\)\}\s*<\/div>\s*<\/div>/;

const oldEditUiRegex = /\{\/\* Variations Section \*\/\}\s*<div className="flex flex-col gap-3 mt-2">[\s\S]*?\{editDeviceVariations\.length === 0 && \([\s\S]*?No variations added yet\.<\/div>\s*\)\}\s*<\/div>\s*<\/div>/;

content = content.replace(oldAddUiRegex, newUi);
content = content.replace(oldEditUiRegex, editUi);

fs.writeFileSync(filePath, content);
console.log('Patch complete.');
