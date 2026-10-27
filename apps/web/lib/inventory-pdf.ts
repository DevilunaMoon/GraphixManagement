import { jsPDF } from 'jspdf';
import { GRAPHIX_LOGO_BASE64 } from './graphix-logo-base64';

export interface InventoryDeviceItem {
  id?: string;
  name: string;
  brand?: string;
  type?: string;
  isPreOwned?: boolean;
  price?: number;
  stock?: number;
  totalStock?: number;
  branch?: string;
  category?: { id?: string; name: string };
  branchStockMap?: Record<string, number>;
  tagoloanStock?: number;
  villanuevaStock?: number;
  jasaanStock?: number;
  specs?: string;
  productId?: string;
  variations?: Array<{
    id?: string;
    name?: string;
    type?: string;
    productId?: string;
    price?: number;
    stock?: number;
    totalStock?: number;
    branchStocks?: Record<string, number>;
    tagoloanStock?: number;
    villanuevaStock?: number;
    jasaanStock?: number;
  }>;
}

export interface InventoryReportOptions {
  devices: InventoryDeviceItem[];
  branch: string; // 'Tagoloan' | 'Villanueva' | 'Jasaan' | 'all' | 'All Branches'
  userRole?: string; // 'Cashier' | 'Branch Admin' | 'Super Admin' | 'Admin'
  conditionFilter?: string; // 'all' | 'new' | 'pre-owned'
  searchQuery?: string;
  categoryFilter?: string;
}

function parseBrandFromName(name: string): string {
  const firstWord = (name || '').trim().split(' ')[0] || '';
  if (/^iphone|^ipad|^macbook|^apple/i.test(name)) return 'Apple';
  if (/^vivo/i.test(name)) return 'Vivo';
  if (/^xiaomi|^redmi|^poco/i.test(name)) return 'Xiaomi';
  if (/^infinix/i.test(name)) return 'Infinix';
  if (/^itel/i.test(name)) return 'Itel';
  if (/^villaon/i.test(name)) return 'Villaon';
  if (/^realme/i.test(name)) return 'Realme';
  if (/^samsung/i.test(name)) return 'Samsung';
  if (/^oppo/i.test(name)) return 'Oppo';
  if (/^tecno/i.test(name)) return 'Tecno';
  if (/^huawei/i.test(name)) return 'Huawei';
  if (/^honor/i.test(name)) return 'Honor';
  return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase() || 'Standard';
}

function formatStorageString(name?: string, type?: string, specs?: string): string {
  const combined = `${name || ''} ${specs || ''}`.trim();
  const match = combined.match(/(\d+)\s*(GB|TB|gb|tb)/i);
  if (match) {
    const num = match[1];
    const unit = match[2]?.toUpperCase() || 'GB';
    return `${num} ${unit}`;
  }
  if (name && !name.toLowerCase().includes('standard') && !name.toLowerCase().includes('default')) {
    return name;
  }
  return 'Standard';
}

function formatProductIdFallback(modelName: string, variantName?: string): string {
  const cleanModel = (modelName || 'DEVICE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const cleanVariant = (variantName || 'STD')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `${cleanModel}-${cleanVariant}`;
}

function formatPeso(amount: number): string {
  return Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function drawPriceWithPeso(doc: jsPDF, price: number, rightX: number, y: number, fontSize = 8) {
  const numStr = formatPeso(price);
  const fullText = `P ${numStr}`;
  const totalWidth = doc.getTextWidth(fullText);
  const startX = rightX - totalWidth;

  // Print text
  doc.text(fullText, startX, y);

  // Draw authentic Philippine Peso crossbars on letter P
  const pWidth = doc.getTextWidth('P');
  const scale = fontSize / 8;
  const line1Y = y - (1.6 * scale);
  const line2Y = y - (1.1 * scale);

  const prevLineWidth = doc.getLineWidth();
  doc.setLineWidth(0.2 * scale);
  doc.line(startX - 0.2, line1Y, startX + pWidth + 0.2, line1Y);
  doc.line(startX - 0.2, line2Y, startX + pWidth + 0.2, line2Y);
  doc.setLineWidth(prevLineWidth);
}

export async function generateProductInventoryPDF(options: InventoryReportOptions) {
  const { devices, branch, userRole = 'Cashier', conditionFilter, searchQuery, categoryFilter } = options;

  // 1. Resolve Branch Display
  let branchDisplay = 'All Branches';
  const cleanBranch = branch.trim().toLowerCase();
  if (cleanBranch === 'tagoloan' || cleanBranch.includes('tagoloan')) {
    branchDisplay = 'Tagoloan Branch';
  } else if (cleanBranch === 'villanueva' || cleanBranch.includes('villanueva')) {
    branchDisplay = 'Villanueva Branch';
  } else if (cleanBranch === 'jasaan' || cleanBranch.includes('jasaan')) {
    branchDisplay = 'Jasaan Branch';
  } else if (cleanBranch && cleanBranch !== 'all' && cleanBranch !== 'all branches') {
    branchDisplay = branch.includes('Branch') ? branch : `${branch} Branch`;
  }

  // 2. Filter Devices based on active view filters if provided
  let filteredDevices = devices;
  if (conditionFilter && conditionFilter !== 'all') {
    const isPre = conditionFilter.toLowerCase() === 'pre-owned';
    filteredDevices = filteredDevices.filter(d => Boolean(d.isPreOwned) === isPre);
  }
  if (categoryFilter && categoryFilter !== 'All' && categoryFilter !== 'All Categories') {
    filteredDevices = filteredDevices.filter(d => 
      d.category?.name?.toLowerCase() === categoryFilter.toLowerCase() ||
      d.brand?.toLowerCase() === categoryFilter.toLowerCase()
    );
  }
  if (searchQuery && searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    filteredDevices = filteredDevices.filter(d => 
      d.name?.toLowerCase().includes(q) ||
      d.category?.name?.toLowerCase().includes(q) ||
      d.variations?.some(v => v.productId?.toLowerCase().includes(q) || v.name?.toLowerCase().includes(q))
    );
  }

  // 3. Flatten into discrete Product Variant Rows
  interface InventoryRow {
    modelName: string;
    productId: string;
    brand: string;
    storage: string;
    condition: 'New' | 'Pre-Owned';
    stock: number;
    price: number;
    isFirstOfModel: boolean;
  }

  const rows: InventoryRow[] = [];
  const modelSet = new Set<string>();

  filteredDevices.forEach((device) => {
    const modelName = device.name || 'Unnamed Product';
    const brand = device.category?.name || device.brand || parseBrandFromName(modelName);
    const condition: 'New' | 'Pre-Owned' = device.isPreOwned ? 'Pre-Owned' : 'New';

    modelSet.add(modelName);

    const hasVariations = device.variations && Array.isArray(device.variations) && device.variations.length > 0;

    if (hasVariations && device.variations) {
      device.variations.forEach((v, vIdx) => {
        const prodId = v.productId || formatProductIdFallback(modelName, v.name);
        const storage = formatStorageString(v.name, v.type, device.specs);

        // Branch-specific or consolidated stock
        let stock = 0;
        if (cleanBranch !== 'all' && cleanBranch !== 'all branches') {
          if (v.branchStocks && typeof v.branchStocks === 'object') {
            const matchKey = Object.keys(v.branchStocks).find(k => k.toLowerCase() === cleanBranch);
            stock = matchKey ? (v.branchStocks[matchKey] || 0) : (v.stock || 0);
          } else {
            const bKey = `${cleanBranch}Stock` as keyof typeof v;
            stock = Number(v[bKey] ?? v.stock ?? 0);
          }
        } else {
          if (v.branchStocks && typeof v.branchStocks === 'object') {
            stock = Object.values(v.branchStocks).reduce((sum, s) => sum + (Number(s) || 0), 0);
          } else {
            stock = (Number(v.tagoloanStock || 0) + Number(v.villanuevaStock || 0) + Number(v.jasaanStock || 0)) || Number(v.totalStock ?? v.stock ?? 0);
          }
        }

        const price = Number(v.price || device.price || 0);

        rows.push({
          modelName,
          productId: prodId,
          brand,
          storage,
          condition,
          stock,
          price,
          isFirstOfModel: vIdx === 0
        });
      });
    } else {
      // Single product row
      const prodId = device.productId || formatProductIdFallback(modelName, 'STD');
      const storage = formatStorageString('', '', device.specs);

      let stock = 0;
      if (cleanBranch !== 'all' && cleanBranch !== 'all branches') {
        if (device.branchStockMap && typeof device.branchStockMap === 'object') {
          const matchKey = Object.keys(device.branchStockMap).find(k => k.toLowerCase() === cleanBranch);
          stock = matchKey ? (device.branchStockMap[matchKey] || 0) : (device.stock || 0);
        } else {
          const bKey = `${cleanBranch}Stock` as keyof typeof device;
          stock = Number(device[bKey] ?? device.stock ?? 0);
        }
      } else {
        if (device.branchStockMap && typeof device.branchStockMap === 'object') {
          stock = Object.values(device.branchStockMap).reduce((sum, s) => sum + (Number(s) || 0), 0);
        } else {
          stock = (Number(device.tagoloanStock || 0) + Number(device.villanuevaStock || 0) + Number(device.jasaanStock || 0)) || Number(device.totalStock ?? device.stock ?? 0);
        }
      }

      const price = Number(device.price || 0);

      rows.push({
        modelName,
        productId: prodId,
        brand,
        storage,
        condition,
        stock,
        price,
        isFirstOfModel: true
      });
    }
  });

  // 4. Calculate Summary Statistics
  const totalModels = modelSet.size;
  const totalVariants = rows.length;
  const totalStock = rows.reduce((sum, r) => sum + r.stock, 0);
  const newStock = rows.filter(r => r.condition === 'New').reduce((sum, r) => sum + r.stock, 0);
  const preOwnedStock = rows.filter(r => r.condition === 'Pre-Owned').reduce((sum, r) => sum + r.stock, 0);

  // 5. Initialize Landscape A4 Document
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 14;
  const printableWidth = pageWidth - (margin * 2); // 269mm
  const bottomMargin = 18;
  const maxY = pageHeight - bottomMargin;

  // Column Widths (Total = 269mm)
  const colWidths = {
    model: 62,
    productId: 48,
    brand: 32,
    storage: 32,
    condition: 30,
    stock: 30,
    price: 35
  };

  const colPositions = {
    model: margin,
    productId: margin + colWidths.model,
    brand: margin + colWidths.model + colWidths.productId,
    storage: margin + colWidths.model + colWidths.productId + colWidths.brand,
    condition: margin + colWidths.model + colWidths.productId + colWidths.brand + colWidths.storage,
    stock: margin + colWidths.model + colWidths.productId + colWidths.brand + colWidths.storage + colWidths.condition,
    price: margin + colWidths.model + colWidths.productId + colWidths.brand + colWidths.storage + colWidths.condition + colWidths.stock
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const generatedMeta = `Generated: ${dateStr} | ${timeStr} | ${userRole}`;

  // Helper: Draw Main Document Header & Summary Cards on Page 1
  function drawFirstPageHeader(): number {
    const logoX = margin;
    const logoY = 12.5;
    const logoSize = 16; // 16x16 mm

    // Render Official Graphix Logo
    if (GRAPHIX_LOGO_BASE64) {
      try {
        doc.addImage(GRAPHIX_LOGO_BASE64, 'JPEG', logoX, logoY, logoSize, logoSize);
      } catch (err) {
        console.warn('Could not render Graphix logo in PDF:', err);
      }
    }

    const titleX = logoX + logoSize + 4;

    // Brand Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(92, 0, 153); // Graphix Purple
    doc.text('GRAPHIX MANAGEMENT', titleX, 17.5);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text('PRODUCT INVENTORY', titleX, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(92, 0, 153);
    doc.text(branchDisplay, titleX, 28);

    // Meta (Right aligned)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(generatedMeta, pageWidth - margin, 23, { align: 'right' });

    // Subtle horizontal divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 31.5, pageWidth - margin, 31.5);

    // Summary Section (4 Cards)
    const cardY = 34.5;
    const cardHeight = 15;
    const cardWidth = (printableWidth - 9) / 4; // 4 cards with 3mm gaps

    const summaryCards = [
      { label: 'TOTAL PRODUCT MODELS', val: `${totalModels}` },
      { label: 'TOTAL VARIANTS', val: `${totalVariants}` },
      { label: 'TOTAL STOCK', val: `${totalStock} pcs` },
      { label: 'CONDITION BREAKDOWN', val: `New: ${newStock} | Pre-Owned: ${preOwnedStock}` }
    ];

    summaryCards.forEach((card, idx) => {
      const cardX = margin + (idx * (cardWidth + 3));

      // Card Background
      doc.setFillColor(250, 245, 255); // Soft purple-50
      doc.setDrawColor(233, 213, 255); // Purple-200
      doc.setLineWidth(0.3);
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Card Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(126, 34, 206); // Purple 700
      doc.text(card.label, cardX + 3.5, cardY + 4.5);

      // Card Value
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // Dark slate
      doc.text(card.val, cardX + 3.5, cardY + 11);
    });

    return cardY + cardHeight + 5; // Y position for table header (54.5mm)
  }

  // Helper: Draw Repeated Table Header
  function drawTableHeader(y: number): number {
    const headerHeight = 8;

    // Header Background
    doc.setFillColor(92, 0, 153); // Graphix Purple
    doc.rect(margin, y, printableWidth, headerHeight, 'F');

    // Header Text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);

    const textY = y + 5.2;

    doc.text('Product Model', colPositions.model + 3, textY);
    doc.text('Product ID', colPositions.productId + 2, textY);
    doc.text('Brand', colPositions.brand + 2, textY);
    doc.text('Storage', colPositions.storage + (colWidths.storage / 2), textY, { align: 'center' });
    doc.text('Condition', colPositions.condition + (colWidths.condition / 2), textY, { align: 'center' });
    doc.text('Stock', colPositions.stock + colWidths.stock - 3, textY, { align: 'right' });
    doc.text('Price', colPositions.price + colWidths.price - 3, textY, { align: 'right' });

    return y + headerHeight;
  }

  // Helper: Subsequent Page Header
  function drawSubsequentPageHeader(): number {
    const miniLogoSize = 6;
    if (GRAPHIX_LOGO_BASE64) {
      try {
        doc.addImage(GRAPHIX_LOGO_BASE64, 'JPEG', margin, 9.5, miniLogoSize, miniLogoSize);
      } catch (err) {}
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(92, 0, 153);
    doc.text('GRAPHIX MANAGEMENT — PRODUCT INVENTORY', margin + miniLogoSize + 2.5, 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`${branchDisplay} | ${generatedMeta}`, pageWidth - margin, 14, { align: 'right' });

    return drawTableHeader(18);
  }

  // Start Rendering Table Rows
  let currentY = drawFirstPageHeader();
  currentY = drawTableHeader(currentY);

  const rowHeight = 7.2;

  rows.forEach((row, index) => {
    // Check if new page is needed
    if (currentY + rowHeight > maxY) {
      doc.addPage();
      currentY = drawSubsequentPageHeader();
    }

    // Row Background (Alternating very light lavender)
    if (index % 2 === 1) {
      doc.setFillColor(250, 245, 255);
      doc.rect(margin, currentY, printableWidth, rowHeight, 'F');
    }

    // Bottom Border
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(margin, currentY + rowHeight, margin + printableWidth, currentY + rowHeight);

    const textY = currentY + 4.8;

    // 1. Product Model
    doc.setFont('helvetica', row.isFirstOfModel ? 'bold' : 'normal');
    doc.setFontSize(8);
    doc.setTextColor(row.isFirstOfModel ? 15 : 71, row.isFirstOfModel ? 23 : 85, row.isFirstOfModel ? 42 : 105);
    const safeModel = doc.splitTextToSize(row.modelName, colWidths.model - 5);
    doc.text(safeModel[0] || row.modelName, colPositions.model + 3, textY);

    // 2. Product ID (Graphix Purple / Mono-like)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(126, 34, 206); // Purple 700
    const safeProdId = doc.splitTextToSize(row.productId, colWidths.productId - 4);
    doc.text(safeProdId[0] || row.productId, colPositions.productId + 2, textY);

    // 3. Brand
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(row.brand.slice(0, 18), colPositions.brand + 2, textY);

    // 4. Storage (Center)
    doc.text(row.storage, colPositions.storage + (colWidths.storage / 2), textY, { align: 'center' });

    // 5. Condition (Center)
    if (row.condition === 'New') {
      doc.setTextColor(16, 185, 129); // Emerald
      doc.setFont('helvetica', 'bold');
      doc.text('New', colPositions.condition + (colWidths.condition / 2), textY, { align: 'center' });
    } else {
      doc.setTextColor(217, 119, 6); // Amber 600
      doc.setFont('helvetica', 'bold');
      doc.text('Pre-Owned', colPositions.condition + (colWidths.condition / 2), textY, { align: 'center' });
    }

    // 6. Stock (Right)
    doc.setFont('helvetica', 'normal');
    if (row.stock === 0) {
      doc.setTextColor(225, 29, 72); // Rose 600
      doc.setFont('helvetica', 'bold');
      doc.text('0 pcs (Out)', colPositions.stock + colWidths.stock - 3, textY, { align: 'right' });
    } else {
      doc.setTextColor(15, 23, 42);
      doc.text(`${row.stock} pcs`, colPositions.stock + colWidths.stock - 3, textY, { align: 'right' });
    }

    // 7. Price (Right)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    drawPriceWithPeso(doc, row.price, colPositions.price + colWidths.price - 3, textY, 8);

    currentY += rowHeight;
  });

  // Empty state handling
  if (rows.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('No product inventory records found matching the current criteria.', pageWidth / 2, currentY + 12, { align: 'center' });
  }

  // 6. Add Dynamic Page Footers Across All Pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    // Footer Text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.text('Graphix Management System', margin, pageHeight - 7);
    doc.text(`Product Inventory — ${branchDisplay}`, pageWidth / 2, pageHeight - 7, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  // 7. Save PDF with dynamic branch filename
  const branchFileName = branchDisplay.replace(/\s+/g, '_');
  doc.save(`Graphix_Product_Inventory_${branchFileName}.pdf`);
}
