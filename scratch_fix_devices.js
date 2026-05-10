const fs = require('fs');
const files = [
  'apps/web/app/AdminSide/AdminInventory.tsx',
  'apps/web/app/CashierSide/CashierDevices.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // handleDeviceImageChange
  const target1 = `  const handleDeviceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setNewDeviceImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };`.replace(/\r\n/g, '\n');

  const repl1 = `  const handleDeviceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file)));
      setNewDeviceImages(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setNewDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };`.replace(/\r\n/g, '\n');

  // handleEditDeviceImageChange
  const target2 = `  const handleEditDeviceImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setEditDeviceImages(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setEditDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };`.replace(/\r\n/g, '\n');

  const repl2 = `  const handleEditDeviceImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const compressedFiles = await Promise.all(files.map(file => imageCompression(file, { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }).catch(() => file)));
      setEditDeviceImages(prev => [...prev, ...compressedFiles]);
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setEditDeviceImagePreviews(prev => [...prev, ...newPreviews]);
    }
  };`.replace(/\r\n/g, '\n');

  // handleNewDownpaymentImageChange
  const target3 = `  const handleNewDownpaymentImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewDeviceDownpaymentImage(file);
      setNewDeviceDownpaymentImagePreview(URL.createObjectURL(file));
    }
  };`.replace(/\r\n/g, '\n');

  const repl3 = `  const handleNewDownpaymentImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };`.replace(/\r\n/g, '\n');

  content = content.replace(/\r\n/g, '\n');
  content = content.replace(target1, repl1);
  content = content.replace(target2, repl2);
  content = content.replace(target3, repl3);

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
