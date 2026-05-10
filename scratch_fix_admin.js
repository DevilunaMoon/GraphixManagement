const fs = require('fs');
const file = 'apps/web/app/AdminSide/AdminInventory.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `  const handleCatImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewCatImage(file);
      setNewCatImagePreview(URL.createObjectURL(file));
    }
  };`.replace(/\r\n/g, '\n');

const repl1 = `  const handleCatImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };`.replace(/\r\n/g, '\n');

content = content.replace(/\r\n/g, '\n');
content = content.replace(target1, repl1);

const target2 = `      } else {
        alert('Failed to add category');
      }
    } catch (err: any) {
      console.error(err);
    } finally {`.replace(/\r\n/g, '\n');

const repl2 = `      } else {
        const text = await res.text();
        let errMsg = text;
        try { errMsg = JSON.parse(text).error || errMsg; } catch(e){}
        alert('Failed to add category: ' + errMsg.slice(0, 150));
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to add category: ' + (err.message || 'Unknown error'));
    } finally {`.replace(/\r\n/g, '\n');

content = content.replace(target2, repl2);

fs.writeFileSync(file, content);
console.log('Fixed AdminInventory.tsx');
