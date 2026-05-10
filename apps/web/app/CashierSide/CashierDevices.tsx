"use client";

import { useState, useEffect } from 'react';
import { ChevronLeft, Pencil, Trash, ChevronRight, AlertCircle, CheckCircle2, Search, Upload, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import imageCompression from 'browser-image-compression';

interface Device {
  id: string;
  name: string;
  image: string | null;
  images?: string[];
  downpaymentImage?: string | null;
  asLowAs?: string | null;
  warranty?: string | null;
  downpayment?: string | null;
  cost: number;
  price: number;
  stock: number;
  categoryId: string | null;
  specs: string | null;
  variations?: any[];
}

export default function CashierDevices() {
  const router = useRouter();
  const navigate = router.push;
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalContent, setSuccessModalContent] = useState({ title: '', message: '' });
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorModalContent, setErrorModalContent] = useState({ title: '', message: '' });
  const [deviceToDelete, setDeviceToDelete] = useState<Device | null>(null);

  // Edit Device Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDeviceId, setEditDeviceId] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceCost, setEditDeviceCost] = useState('');
  const [editDevicePrice, setEditDevicePrice] = useState('');
  const [editDeviceStocks, setEditDeviceStocks] = useState('');
  const [editDeviceCategory, setEditDeviceCategory] = useState('');
  const [editDeviceSpecs, setEditDeviceSpecs] = useState('');
  const [editDeviceImages, setEditDeviceImages] = useState<File[]>([]);
  const [editDeviceImagePreviews, setEditDeviceImagePreviews] = useState<string[]>([]);
  const [editDeviceDownpaymentImage, setEditDeviceDownpaymentImage] = useState<File | null>(null);
  const [editDeviceDownpaymentImagePreview, setEditDeviceDownpaymentImagePreview] = useState<string | null>(null);
  const [editDeviceAsLowAs, setEditDeviceAsLowAs] = useState('');
  const [editDeviceWarranty, setEditDeviceWarranty] = useState('');
  const [editDeviceDownpayment, setEditDeviceDownpayment] = useState('');
  const [isEditingDevice, setIsEditingDevice] = useState(false);
  const [editDeviceError, setEditDeviceError] = useState<string | null>(null);
  const [editVariationGroups, setEditVariationGroups] = useState<{ section: string, variations: { name: string, price: string, cost: string, stock: string }[] }[]>([]);

  // Add Device Modal State
  const [addDeviceModalOpen, setAddDeviceModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceCost, setNewDeviceCost] = useState('');
  const [newDevicePrice, setNewDevicePrice] = useState('');
  const [newDeviceStocks, setNewDeviceStocks] = useState('');
  const [newDeviceCategory, setNewDeviceCategory] = useState('');
  const [newDeviceSpecs, setNewDeviceSpecs] = useState('');
  const [newDeviceImages, setNewDeviceImages] = useState<File[]>([]);
  const [newDeviceImagePreviews, setNewDeviceImagePreviews] = useState<string[]>([]);
  const [newDeviceDownpaymentImage, setNewDeviceDownpaymentImage] = useState<File | null>(null);
  const [newDeviceDownpaymentImagePreview, setNewDeviceDownpaymentImagePreview] = useState<string | null>(null);
  const [newDeviceAsLowAs, setNewDeviceAsLowAs] = useState('');
  const [newDeviceWarranty, setNewDeviceWarranty] = useState('');
  const [newDeviceDownpayment, setNewDeviceDownpayment] = useState('');
  const [variationGroups, setVariationGroups] = useState<{ section: string, variations: { name: string, price: string, cost: string, stock: string }[] }[]>([]);
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [addDeviceError, setAddDeviceError] = useState<string | null>(null);

  const fetchDevices = () => {
    setIsLoading(true);
    fetch(`/api/devices?t=${Date.now()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setDevices(data);
        } else {
          console.error('Expected array of devices, got:', data);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  };

  const handleDeviceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file)));
      setNewDeviceImages(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeNewDeviceImage = (index: number) => {
    setNewDeviceImages(prev => prev.filter((_, i) => i !== index));
    setNewDeviceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleNewDownpaymentImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true });
        setNewDeviceDownpaymentImage(compressed);
        setNewDeviceDownpaymentImagePreview(URL.createObjectURL(compressed));
      } catch(err) {
        setNewDeviceDownpaymentImage(file);
        setNewDeviceDownpaymentImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddDevice = async () => {
    setAddDeviceError(null);
    if (!newDeviceName) return setAddDeviceError('Device Name is required.');
    if (!newDeviceCost) return setAddDeviceError('Cost is required.');
    if (!newDevicePrice) return setAddDeviceError('Selling Price is required.');
    if (!newDeviceStocks) return setAddDeviceError('Stocks are required.');
    if (!newDeviceCategory) return setAddDeviceError('Please assign this device a Category.');

    setIsAddingDevice(true);
    const formData = new FormData();
    formData.append('deviceName', newDeviceName);
    formData.append('deviceCost', newDeviceCost);
    formData.append('devicePrice', newDevicePrice);
    formData.append('deviceStocks', newDeviceStocks);
    formData.append('deviceCategory', newDeviceCategory);
    formData.append('deviceSpecs', newDeviceSpecs);
    if (newDeviceImages.length > 0) {
      newDeviceImages.forEach(file => {
        formData.append('deviceImages', file);
      });
    }
    if (newDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', newDeviceDownpaymentImage);
    }
    if (newDeviceAsLowAs) formData.append('deviceAsLowAs', newDeviceAsLowAs);
    if (newDeviceWarranty) formData.append('deviceWarranty', newDeviceWarranty);
    if (newDeviceDownpayment) formData.append('deviceDownpayment', newDeviceDownpayment);
    if (variationGroups.length > 0) {
      const flattened = variationGroups.flatMap(group =>
        group.variations.map(v => ({
          type: group.section,
          name: v.name,
          price: v.price,
          cost: v.cost,
          stock: v.stock
        }))
      );
      formData.append('variations', JSON.stringify(flattened));
    }

    try {
      const res = await fetch('/api/devices', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add device');
      }

      setAddDeviceModalOpen(false);

      setNewDeviceName('');
      setNewDeviceCost('');
      setNewDevicePrice('');
      setNewDeviceStocks('');
      setNewDeviceCategory('');
      setNewDeviceSpecs('');
      setNewDeviceImages([]);
      setNewDeviceImagePreviews([]);
      setNewDeviceDownpaymentImage(null);
      setNewDeviceDownpaymentImagePreview(null);
      setNewDeviceAsLowAs('');
      setNewDeviceWarranty('');
      setNewDeviceDownpayment('');
      setVariationGroups([]);

      setSuccessModalContent({ title: 'Success!', message: 'The device has been successfully added to the inventory.' });
      setSuccessModalOpen(true);
      fetchDevices();

    } catch (err: any) {
      setAddDeviceError(err.message);
    } finally {
      setIsAddingDevice(false);
    }
  };

  const handleEditDeviceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file)));
      setEditDeviceImages(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setEditDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const removeEditDeviceImage = (index: number) => {
    setEditDeviceImages(prev => prev.filter((_, i) => i !== index));
    setEditDeviceImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditDownpaymentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setEditDeviceDownpaymentImage(file);
      setEditDeviceDownpaymentImagePreview(URL.createObjectURL(file));
    }
  };

  const openEditModal = (device: Device) => {
    setEditDeviceId(device.id);
    setEditDeviceName(device.name);
    setEditDeviceCost(device.cost.toString());
    setEditDevicePrice(device.price.toString());
    setEditDeviceStocks(device.stock.toString());
    setEditDeviceCategory(device.categoryId || '');
    setEditDeviceSpecs(device.specs || '');
    setEditDeviceImagePreviews(device.images && device.images.length > 0 ? device.images : (device.image ? [device.image] : []));
    setEditDeviceImages([]);
    setEditDeviceDownpaymentImagePreview(device.downpaymentImage || null);
    setEditDeviceDownpaymentImage(null);
    setEditDeviceAsLowAs(device.asLowAs || '');
    setEditDeviceWarranty(device.warranty || '');
    setEditDeviceDownpayment(device.downpayment || '');
    setEditDeviceError(null);
    setEditVariationGroups(device.variations ? Object.values(device.variations.reduce((acc: any, v: any) => {
      if (!acc[v.type]) acc[v.type] = { section: v.type, variations: [] };
      acc[v.type].variations.push({ name: v.name, price: v.price?.toString() || '0', cost: v.cost?.toString() || '0', stock: v.stock?.toString() || '0' });
      return acc;
    }, {})) : []);
    setEditModalOpen(true);
  };

  const handleEditDevice = async () => {
    setEditDeviceError(null);
    if (!editDeviceName) return setEditDeviceError('Device Name is required.');
    if (!editDeviceCost) return setEditDeviceError('Cost is required.');
    if (!editDevicePrice) return setEditDeviceError('Selling Price is required.');
    if (!editDeviceStocks) return setEditDeviceError('Stocks are required.');
    if (!editDeviceCategory) return setEditDeviceError('Please assign this device a Category.');

    setIsEditingDevice(true);
    const formData = new FormData();
    formData.append('deviceName', editDeviceName);
    formData.append('deviceCost', editDeviceCost);
    formData.append('devicePrice', editDevicePrice);
    formData.append('deviceStocks', editDeviceStocks);
    formData.append('deviceCategory', editDeviceCategory);
    formData.append('deviceSpecs', editDeviceSpecs);
    if (editDeviceImages.length > 0) {
      editDeviceImages.forEach(file => {
        formData.append('deviceImages', file);
      });
    }
    if (editDeviceDownpaymentImage) {
      formData.append('deviceDownpaymentImage', editDeviceDownpaymentImage);
    }
    formData.append('deviceAsLowAs', editDeviceAsLowAs);
    formData.append('deviceWarranty', editDeviceWarranty);
    formData.append('deviceDownpayment', editDeviceDownpayment);
    if (editVariationGroups.length > 0) {
      const flattened = editVariationGroups.flatMap(group =>
        group.variations.map(v => ({
          type: group.section,
          name: v.name,
          price: v.price,
          cost: v.cost,
          stock: v.stock
        }))
      );
      formData.append('variations', JSON.stringify(flattened));
    }

    try {
      const res = await fetch(`/api/devices/${editDeviceId}`, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update device');
      }

      setEditModalOpen(false);
      setSuccessModalContent({ title: 'Success!', message: 'The device has been successfully updated.' });
      setSuccessModalOpen(true);
      fetchDevices();

    } catch (err: any) {
      setEditDeviceError(err.message);
    } finally {
      setIsEditingDevice(false);
    }
  };

  // Category Management State
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatImage, setNewCatImage] = useState<File | null>(null);
  const [newCatImagePreview, setNewCatImagePreview] = useState<string | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);

  const fetchCategories = () => {
    fetch('/api/categories')
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const compressed = await imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true });
        setNewCatImage(compressed);
        setNewCatImagePreview(URL.createObjectURL(compressed));
      } catch (err) {
        console.error("Compression error:", err);
        setNewCatImage(file);
        setNewCatImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName) return;
    setIsAddingCat(true);
    const formData = new FormData();
    formData.append('categoryName', newCatName);
    if (newCatImage) formData.append('categoryImage', newCatImage);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        setNewCatName('');
        setNewCatImage(null);
        setNewCatImagePreview(null);
        fetchCategories();
        setSuccessModalContent({ title: 'Success', message: 'Category added successfully.' });
        setSuccessModalOpen(true);
      } else {
        const text = await res.text();
        let errMsg = text;
        try { errMsg = JSON.parse(text).error || errMsg; } catch(e){}
        setErrorModalContent({ title: 'Error', message: errMsg.slice(0, 150) });
        setErrorModalOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      setErrorModalContent({ title: 'Error', message: 'Network error: ' + (err.message || '') });
      setErrorModalOpen(true);
    } finally {
      setIsAddingCat(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const openDeleteModal = (device: Device) => {
    setDeviceToDelete(device);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (deviceToDelete) {
      try {
        await fetch(`/api/devices/${deviceToDelete.id}`, { method: 'DELETE' });
        setDevices(prev => prev.filter(d => d.id !== deviceToDelete.id));
        setDeleteModalOpen(false);
        setSuccessModalContent({ title: 'Deleted Successfully', message: `The device ${deviceToDelete?.name || 'this device'} has been removed from the list.` });
        setSuccessModalOpen(true);
      } catch (err) {
        console.error('Failed to delete', err);
      }
    }
  };

  const filteredDevices = devices.filter(device =>
    (device.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (device.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredDevices.length / itemsPerPage));
  const paginatedDevices = filteredDevices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const prevPage = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const nextPage = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  return (
    <main className="flex-1 flex flex-col p-3 md:p-5 gap-5 border-2 border-[#bd00ff] mx-3 my-3 rounded-xl bg-white overflow-hidden font-['Inter'] overflow-y-auto w-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-black hover:text-[#bd00ff] transition-colors border-none bg-transparent cursor-pointer">
            <ChevronLeft size={32} />
          </button>
          <h2 className="text-2xl font-bold text-black">Devices</h2>

          <button
            onClick={() => setAddDeviceModalOpen(true)}
            className="ml-2 px-4 py-2 bg-[#bd00ff] text-white font-bold rounded-lg hover:bg-[#9c00d6] transition-colors border-none cursor-pointer text-sm whitespace-nowrap flex items-center gap-2"
          >
            <Plus size={18} /> Add Device
          </button>
          <button
            onClick={() => setCategoriesModalOpen(true)}
            className="px-4 py-2 bg-purple-100 text-[#bd00ff] font-bold rounded-lg hover:bg-purple-200 transition-colors border-none cursor-pointer text-sm whitespace-nowrap"
          >
            Manage Categories
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by device name or ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-11 pl-11 pr-4 border-2 border-[#bd00ff] rounded-xl focus:ring-4 focus:ring-[#bd00ff]/20 outline-none transition-all text-black font-semibold placeholder:text-gray-400 placeholder:font-normal shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#bd00ff] font-bold" size={20} />
        </div>
      </div>

      {/* Devices Table */}
      <div className="w-full mt-2">
        {isLoading ? (
          <div className="w-full py-20 flex flex-col items-center justify-center gap-4 border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm">
            <div className="w-12 h-12 border-4 border-purple-100 border-t-[#bd00ff] rounded-full animate-spin"></div>
            <p className="text-[#666] font-semibold animate-pulse text-lg">Loading devices...</p>
          </div>
        ) : paginatedDevices.length > 0 ? (
          <div className="overflow-x-auto w-full border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-gray-50 border-b border-[#bd00ff]/20 text-gray-700 whitespace-nowrap">
                  <th className="p-4 font-bold text-center w-28 text-[1.05rem]">Image</th>
                  <th className="p-4 font-bold text-[1.05rem]">Device Name</th>
                  <th className="p-4 font-bold text-[1.05rem]">Cost</th>
                  <th className="p-4 font-bold text-[1.05rem]">Price</th>
                  <th className="p-4 font-bold text-center text-[1.05rem]">Quantity</th>
                  <th className="p-4 font-bold text-[1.05rem] w-32 hidden sm:table-cell">Device ID</th>
                  <th className="p-4 font-bold text-center w-40 text-[1.05rem]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDevices.map(device => (
                  <tr key={device.id} className="border-b border-gray-100/80 hover:bg-purple-50/50 transition-colors group">
                    <td className="p-4 flex justify-center align-middle">
                      <div className="h-16 w-16 shrink-0 rounded-full border border-gray-200 flex justify-center items-center overflow-hidden bg-white shadow-sm group-hover:border-[#bd00ff]/40 transition-colors">
                        {device.image ? (
                          <img src={device.image} alt={device.name} className="h-full w-full object-contain p-1" />
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest">No Img</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-bold text-[1.1rem] text-black align-middle">{device.name || 'Unnamed'}</td>
                    <td className="p-4 font-bold text-[1.05rem] text-gray-600 align-middle">
                      ₱{device.cost ? Number(device.cost).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-4 font-bold text-[1.05rem] text-[#bd00ff] align-middle">
                      ₱{device.price ? Number(device.price).toFixed(2) : '0.00'}
                    </td>
                    <td className="p-4 text-center align-middle">
                      <span className={`font-bold text-[1.1rem] ${(device.stock || 0) === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                        {device.stock || 0} <span className="text-[0.8rem] font-bold opacity-50 tracking-wider ml-1">PCS</span>
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[0.9rem] text-gray-800 align-middle hidden sm:table-cell">
                      <span className="bg-gray-200 px-3 py-1.5 rounded border border-gray-300 font-extrabold tracking-wider shadow-sm text-[0.95rem]">#{device.id ? String(device.id).slice(-6).toUpperCase() : 'UNKNOWN'}</span>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex gap-4 justify-center items-center">
                        <button
                          onClick={() => openEditModal(device)}
                          className="w-11 h-11 rounded-full flex justify-center items-center bg-[#bd00ff] text-white hover:bg-[#9c00d6] hover:scale-110 transition-all border-none cursor-pointer shadow-md"
                          title="Edit Device"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => openDeleteModal(device)}
                          className="w-11 h-11 rounded-full flex justify-center items-center bg-red-600 text-white hover:bg-red-700 hover:scale-110 transition-all border-none cursor-pointer shadow-md"
                          title="Delete Device"
                        >
                          <Trash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="w-full py-12 text-center flex flex-col items-center justify-center border-2 border-[#bd00ff] rounded-2xl bg-white shadow-sm gap-2">
            <AlertCircle className="text-gray-400 w-12 h-12 mb-2" />
            <span className="text-gray-500 font-bold text-lg">No devices found in inventory.</span>
            <span className="text-gray-400 text-sm">Add a new device to see it here.</span>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button
          onClick={prevPage}
          disabled={currentPage === 1}
          className={`text-black transition-transform bg-transparent border-none flex items-center justify-center ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
        >
          <ChevronLeft size={28} />
        </button>
        <span className="font-bold text-lg text-black min-w-[3rem] text-center">{currentPage}/{totalPages}</span>
        <button
          onClick={nextPage}
          disabled={currentPage === totalPages}
          className={`text-black transition-transform bg-transparent border-none flex items-center justify-center ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'}`}
        >
          <ChevronRight size={28} />
        </button>
      </div>
      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <AlertCircle className="text-red-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">Delete Device?</h3>
            <p className="text-gray-600 mb-8">
              Are you sure you want to delete <strong className="text-black">{deviceToDelete?.name || 'this device'}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="px-6 py-2.5 border border-gray-400 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors cursor-pointer bg-transparent"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors cursor-pointer border-none"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {errorModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <AlertCircle className="text-red-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">{errorModalContent.title}</h3>
            <p className="text-gray-600 mb-8 font-medium">
              {errorModalContent.message}
            </p>
            <button
              onClick={() => setErrorModalOpen(false)}
              className="px-8 py-2.5 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition-colors cursor-pointer border-none w-full max-w-[200px]"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-[400px] w-full text-center shadow-2xl animate-in zoom-in-95 flex flex-col items-center">
            <CheckCircle2 className="text-green-500 w-16 h-16 mb-5" />
            <h3 className="text-xl font-bold mb-3 text-black">{successModalContent.title}</h3>
            <p className="text-gray-600 mb-8">
              {successModalContent.message}
            </p>
            <button
              onClick={() => setSuccessModalOpen(false)}
              className="px-8 py-2.5 bg-[#bd00ff] text-white rounded-lg font-medium hover:bg-[#9c00d6] transition-colors cursor-pointer border-none w-full max-w-[200px]"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      {addDeviceModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[95vh]">

            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-black m-0">Add New Device</h3>
              <button onClick={() => setAddDeviceModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex flex-col gap-6">
              {addDeviceError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-200">{addDeviceError}</div>}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Uploads */}
                <div className="shrink-0 flex flex-col gap-6 w-full md:w-[200px]">

                  <div className="flex flex-col gap-2">
                    <label className="w-full h-[120px] rounded-xl border-2 border-dashed border-[#bd00ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-purple-50 transition-colors text-[#bd00ff] bg-white">
                      <Upload size={24} />
                      <span className="text-xs font-semibold text-center leading-tight">Upload Photos</span>
                      <input type="file" multiple onChange={handleDeviceImageChange} accept="image/*" className="hidden" />
                    </label>
                    {newDeviceImagePreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {newDeviceImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-[60px] h-[60px] shrink-0 border border-gray-200 rounded-lg overflow-hidden group">
                            <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeNewDeviceImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  

                </div>

                {/* Main Inputs */}
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Device Name <span className="text-red-500">*</span></label>
                    <input type="text" value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="e.g. iPhone 15 Pro" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Cost <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={newDeviceCost} onChange={e => setNewDeviceCost(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Selling Price <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={newDevicePrice} onChange={e => setNewDevicePrice(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Stocks <span className="text-red-500">*</span></label>
                      <input type="number" value={newDeviceStocks} onChange={e => setNewDeviceStocks(e.target.value)} placeholder="0" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specifications and Category */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-gray-700">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={newDeviceCategory}
                      onChange={e => setNewDeviceCategory(e.target.value)}
                      className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 outline-none transition-all text-black font-semibold appearance-none bg-white cursor-pointer hover:border-gray-300"
                    >
                      <option value="" disabled className="text-gray-400">Select a category...</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat.id} className="font-medium text-black">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-gray-700">Specs / Description</label>
                  <textarea value={newDeviceSpecs} onChange={e => setNewDeviceSpecs(e.target.value)} rows={3} placeholder="Memory, Color, Connectivity, etc..." className="w-full border-2 border-gray-200 rounded-xl p-4 focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 outline-none transition-all text-black font-medium resize-y min-h-[80px]" />
                </div>

                {/* Downpayment Section */}
                <div className="mt-2 border-2 border-cyan-100 bg-cyan-50/20 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#01f0ff]" />
                  <h4 className="text-cyan-800 font-bold text-sm m-0">Downpayment Options</h4>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* QR Uploader */}
                    <div className="shrink-0 w-full md:w-[140px] flex flex-col gap-1">
                      <label className="block text-xs font-bold text-gray-700">QR Code</label>
                      <label className="w-full h-[100px] rounded-xl border-2 border-dashed border-[#01f0ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-cyan-50 transition-colors text-[#01f0ff] overflow-hidden relative bg-white">
                        {newDeviceDownpaymentImagePreview ? (
                          <img src={newDeviceDownpaymentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload size={16} />
                            <span className="text-[10px] font-semibold text-center leading-tight px-2">Upload QR</span>
                          </>
                        )}
                        <input type="file" onChange={handleNewDownpaymentImageChange} accept="image/*" className="hidden" />
                      </label>
                    </div>

                    {/* Text Fields */}
                    <div className="flex-1 flex flex-col gap-3 justify-end">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-gray-700">As Low As <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={newDeviceAsLowAs} onChange={e => setNewDeviceAsLowAs(e.target.value)} placeholder="e.g. ₱1,500/mo" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-gray-700">Warranty <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={newDeviceWarranty} onChange={e => setNewDeviceWarranty(e.target.value)} placeholder="e.g. 1 Year Local" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-xs font-bold text-gray-700">Downpayment <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                        <input type="text" value={newDeviceDownpayment} onChange={e => setNewDeviceDownpayment(e.target.value)} placeholder="e.g. 20% or ₱5,000" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button
                      type="button"
                      onClick={() => {
                        setVariationGroups([...variationGroups, { section: '', variations: [{ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' }] }])
                      }}
                      className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Section
                    </button>
                  </div>

                  {variationGroups.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {variationGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          {/* Section Header */}
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input
                              type="text"
                              value={group.section}
                              onChange={e => {
                                const updated = [...variationGroups];
                                if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                                setVariationGroups(updated);
                              }}
                              className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]"
                              placeholder="e.g. Color"
                            />
                            <div className="flex-1"></div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = variationGroups.filter((_, i) => i !== groupIdx);
                                setVariationGroups(updated);
                              }}
                              className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm"
                              title="Remove Section"
                            >
                              <Trash size={14} />
                            </button>
                          </div>

                          {/* Variation Rows */}
                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group.variations.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v.name} onChange={e => {
                                    const updated = [...variationGroups];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setVariationGroups(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[50%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...variationGroups];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setVariationGroups(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v.stock} onChange={e => {
                                      const updated = [...variationGroups];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setVariationGroups(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...variationGroups];
                                    if (updated[groupIdx]) {
                                      updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                      setVariationGroups(updated);
                                    }
                                  }}
                                  className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...variationGroups];
                                if (updated[groupIdx]) {
                                  updated[groupIdx].variations.push({ name: '', price: newDevicePrice || '0', cost: newDeviceCost || '0', stock: '0' });
                                  setVariationGroups(updated);
                                }
                              }}
                              className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Variation
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setAddDeviceModalOpen(false)}
                className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddDevice}
                disabled={isAddingDevice}
                className="px-8 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isAddingDevice ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Device'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Edit Device Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[95vh]">

            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50 shrink-0">
              <h3 className="text-xl font-bold text-black m-0">Edit Device</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 flex flex-col gap-6">
              {editDeviceError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm font-semibold border border-red-200">{editDeviceError}</div>}

              <div className="flex flex-col md:flex-row gap-6">
                {/* Image Uploads */}
                <div className="shrink-0 flex flex-col gap-6 w-full md:w-[200px]">

                  <div className="flex flex-col gap-2">
                    <label className="w-full h-[120px] rounded-xl border-2 border-dashed border-[#bd00ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-purple-50 transition-colors text-[#bd00ff] bg-white">
                      <Upload size={24} />
                      <span className="text-xs font-semibold text-center leading-tight">Upload Photos</span>
                      <input type="file" multiple onChange={handleEditDeviceImageChange} accept="image/*" className="hidden" />
                    </label>
                    {editDeviceImagePreviews.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {editDeviceImagePreviews.map((preview, idx) => (
                          <div key={idx} className="relative w-[60px] h-[60px] shrink-0 border border-gray-200 rounded-lg overflow-hidden group">
                            <img src={preview} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeEditDeviceImage(idx)} className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-none cursor-pointer"><X size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  

                </div>

                {/* Main Inputs */}
                <div className="flex-1 flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Device Name <span className="text-red-500">*</span></label>
                    <input type="text" value={editDeviceName} onChange={e => setEditDeviceName(e.target.value)} placeholder="e.g. iPhone 15 Pro" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Cost <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={editDeviceCost} onChange={e => setEditDeviceCost(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Selling Price <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={editDevicePrice} onChange={e => setEditDevicePrice(e.target.value)} placeholder="0.00" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Stocks <span className="text-red-500">*</span></label>
                      <input type="number" value={editDeviceStocks} onChange={e => setEditDeviceStocks(e.target.value)} placeholder="0" className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Specifications and Category */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-gray-700">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select
                      value={editDeviceCategory}
                      onChange={e => setEditDeviceCategory(e.target.value)}
                      className="w-full h-11 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 outline-none transition-all text-black font-semibold appearance-none bg-white cursor-pointer hover:border-gray-300"
                    >
                      <option value="" disabled className="text-gray-400">Select a category...</option>
                      {categories.map((cat, idx) => (
                        <option key={idx} value={cat.id} className="font-medium text-black">
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="block text-sm font-bold text-gray-700">Specs / Description</label>
                  <textarea value={editDeviceSpecs} onChange={e => setEditDeviceSpecs(e.target.value)} rows={3} placeholder="Memory, Color, Connectivity, etc..." className="w-full border-2 border-gray-200 rounded-xl p-4 focus:border-[#bd00ff] focus:ring-4 focus:ring-[#bd00ff]/10 outline-none transition-all text-black font-medium resize-y min-h-[80px]" />
                </div>

                {/* Downpayment Section */}
                <div className="mt-2 border-2 border-cyan-100 bg-cyan-50/20 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#01f0ff]" />
                  <h4 className="text-cyan-800 font-bold text-sm m-0">Downpayment Options</h4>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* QR Uploader */}
                    <div className="shrink-0 w-full md:w-[140px] flex flex-col gap-1">
                      <label className="block text-xs font-bold text-gray-700">QR Code</label>
                      <label className="w-full h-[100px] rounded-xl border-2 border-dashed border-[#01f0ff] flex flex-col justify-center items-center gap-1 cursor-pointer hover:bg-cyan-50 transition-colors text-[#01f0ff] overflow-hidden relative bg-white">
                        {editDeviceDownpaymentImagePreview ? (
                          <img src={editDeviceDownpaymentImagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <Upload size={16} />
                            <span className="text-[10px] font-semibold text-center leading-tight px-2">Upload QR</span>
                          </>
                        )}
                        <input type="file" onChange={handleEditDownpaymentImageChange} accept="image/*" className="hidden" />
                      </label>
                    </div>

                    {/* Text Fields */}
                    <div className="flex-1 flex flex-col gap-3 justify-end">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-gray-700">As Low As <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={editDeviceAsLowAs} onChange={e => setEditDeviceAsLowAs(e.target.value)} placeholder="e.g. ₱1,500/mo" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                        </div>
                        <div className="flex-1 flex flex-col gap-1">
                          <label className="block text-xs font-bold text-gray-700">Warranty <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                          <input type="text" value={editDeviceWarranty} onChange={e => setEditDeviceWarranty(e.target.value)} placeholder="e.g. 1 Year Local" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="block text-xs font-bold text-gray-700">Downpayment <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                        <input type="text" value={editDeviceDownpayment} onChange={e => setEditDeviceDownpayment(e.target.value)} placeholder="e.g. 20% or ₱5,000" className="w-full h-10 border-2 border-cyan-100 rounded-lg px-3 focus:border-[#01f0ff] outline-none transition-colors text-black text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Edit Variations Section */}
                <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-bold text-gray-700">Variations <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditVariationGroups([...editVariationGroups, { section: '', variations: [{ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' }] }])
                      }}
                      className="text-xs font-bold text-[#bd00ff] bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-none cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={14} /> Add Section
                    </button>
                  </div>

                  {editVariationGroups.length > 0 && (
                    <div className="flex flex-col gap-4 mt-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {editVariationGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="flex flex-col gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200 relative">
                          <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Section</label>
                            <input
                              type="text"
                              value={group.section}
                              onChange={e => {
                                const updated = [...editVariationGroups];
                                if (updated[groupIdx]) updated[groupIdx].section = e.target.value;
                                setEditVariationGroups(updated);
                              }}
                              className="h-9 border border-gray-300 rounded-lg px-3 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold flex-1 max-w-[200px]"
                              placeholder="e.g. Color"
                            />
                            <div className="flex-1"></div>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = editVariationGroups.filter((_, i) => i !== groupIdx);
                                setEditVariationGroups(updated);
                              }}
                              className="h-8 w-8 flex items-center justify-center shrink-0 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors border-none cursor-pointer shadow-sm"
                              title="Remove Section"
                            >
                              <Trash size={14} />
                            </button>
                          </div>

                          <div className="flex flex-col gap-2 pl-2 border-l-2 border-purple-200 ml-2">
                            {group.variations.map((v, vIdx) => (
                              <div key={vIdx} className="flex flex-col sm:flex-row gap-2 items-start sm:items-end relative group/var">
                                <div className="w-full sm:w-1/3">
                                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Variation Name</label>
                                  <input type="text" value={v.name} onChange={e => {
                                    const updated = [...editVariationGroups];
                                    if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                      updated[groupIdx].variations[vIdx].name = e.target.value;
                                      setEditVariationGroups(updated);
                                    }
                                  }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="e.g. Red" />
                                </div>
                                <div className="flex gap-2 w-full sm:w-[50%]">
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Price</label>
                                    <input type="number" step="0.01" value={v.price} onChange={e => {
                                      const updated = [...editVariationGroups];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].price = e.target.value;
                                        setEditVariationGroups(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Price" />
                                  </div>
                                  <div className="flex-1">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Stock</label>
                                    <input type="number" value={v.stock} onChange={e => {
                                      const updated = [...editVariationGroups];
                                      if (updated[groupIdx] && updated[groupIdx].variations[vIdx]) {
                                        updated[groupIdx].variations[vIdx].stock = e.target.value;
                                        setEditVariationGroups(updated);
                                      }
                                    }} className="w-full h-9 border border-gray-300 rounded-lg px-2 text-sm outline-none focus:border-[#bd00ff] text-black font-semibold" placeholder="Stock" />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editVariationGroups];
                                    if (updated[groupIdx]) {
                                      updated[groupIdx].variations = updated[groupIdx].variations.filter((_, i) => i !== vIdx);
                                      setEditVariationGroups(updated);
                                    }
                                  }}
                                  className="absolute -top-1 -right-1 h-5 w-5 sm:relative sm:top-0 sm:right-0 sm:h-9 sm:w-9 flex items-center justify-center shrink-0 rounded-full sm:rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors border-none cursor-pointer"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...editVariationGroups];
                                if (updated[groupIdx]) {
                                  updated[groupIdx].variations.push({ name: '', price: editDevicePrice || '0', cost: editDeviceCost || '0', stock: '0' });
                                  setEditVariationGroups(updated);
                                }
                              }}
                              className="mt-2 self-start text-[11px] font-bold text-[#bd00ff] bg-transparent hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors border-2 border-dashed border-[#bd00ff]/50 hover:border-[#bd00ff] cursor-pointer flex items-center gap-1"
                            >
                              <Plus size={12} /> Add Variation
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0 flex justify-end gap-3 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-6 py-2.5 font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEditDevice}
                disabled={isEditingDevice}
                className="px-8 py-2.5 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isEditingDevice ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Update Settings'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Categories Management Modal */}
      {categoriesModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col overflow-hidden max-h-[90vh]">

            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-xl font-bold text-black m-0">Manage Categories</h3>
              <button onClick={() => setCategoriesModalOpen(false)} className="text-gray-500 hover:text-black hover:bg-gray-200 p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">

              {/* Add Category Form */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <label className="shrink-0 w-16 h-16 rounded-full border-2 border-dashed border-[#bd00ff] flex flex-col justify-center items-center cursor-pointer hover:bg-white transition-colors text-[#bd00ff] overflow-hidden relative bg-transparent">
                  {newCatImagePreview ? (
                    <img src={newCatImagePreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={20} />
                  )}
                  <input type="file" onChange={handleCatImageChange} accept="image/*" className="hidden" />
                </label>

                <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="Enter new category name..."
                    className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 focus:border-[#bd00ff] outline-none transition-colors text-black"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCategory();
                    }}
                  />
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={!newCatName || isAddingCat}
                  className="w-full sm:w-auto h-12 px-6 bg-[#bd00ff] text-white font-bold rounded-xl hover:bg-[#9c00d6] transition-colors border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isAddingCat ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <><Plus size={20} /> Add</>}
                </button>
              </div>

              {/* List Categories */}
              <div className="flex flex-col gap-3">
                <h4 className="text-gray-500 font-bold uppercase text-sm mb-2">Existing Categories</h4>
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">No categories found. Add one above!</div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {categories.map((cat, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-[#bd00ff] transition-colors">
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {cat.logoUrl ? (
                            <img src={cat.logoUrl} alt={cat.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs text-gray-400 font-bold">No Img</span>
                          )}
                        </div>
                        <span className="font-semibold text-black break-words line-clamp-2 text-sm">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}
