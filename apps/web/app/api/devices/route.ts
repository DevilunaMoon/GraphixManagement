import { NextResponse } from 'next/server';
import { prisma } from 'database';
import { uploadToCloudinary } from '../../../lib/cloudinary';
import { getSession } from '../../../lib/session';
import { triggerStockAlert } from '../../../lib/stock-alerts';
import { logActivity } from '../../../lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatProductId(modelName: string, variantName?: string, customProductId?: string) {
  if (customProductId && customProductId.trim()) {
    return customProductId.trim().toUpperCase();
  }
  const cleanModel = (modelName || 'DEVICE')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  if (!variantName || !variantName.trim() || variantName.toLowerCase() === 'standard' || variantName.toLowerCase() === 'std') {
    return `${cleanModel}-STD`;
  }

  const trimmedVariant = variantName.trim().toUpperCase();
  const storageNumMatch = trimmedVariant.match(/^(\d+)\s*(GB|TB)$/i);
  let cleanVariant = '';
  if (storageNumMatch && storageNumMatch[1]) {
    cleanVariant = storageNumMatch[1];
  } else {
    cleanVariant = trimmedVariant
      .replace(/[^A-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  if (!cleanVariant) cleanVariant = 'STD';
  return `${cleanModel}-${cleanVariant}`;
}

export async function GET(req: Request) {
  try {
    const session = await getSession();
    const isSuperAdmin = session?.role === 'SUPER_ADMIN';

    const { searchParams } = new URL(req.url);
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const search = searchParams.get('search') || '';
    const brand = searchParams.get('brand') || '';
    const typeFilter = searchParams.get('type') || '';
    const branchParam = searchParams.get('branch');
    const stockStatus = searchParams.get('stockStatus'); // 'all' | 'low' | 'out'
    const condition = searchParams.get('condition') || ''; // 'all' | 'new' | 'pre-owned'

    // RBAC: Super Admin can query any branch or 'all'. Branch Admin and Cashier are strictly scoped to their assigned branch.
    const activeBranch = isSuperAdmin
      ? (branchParam === 'all' ? undefined : (branchParam || undefined))
      : (session && (session.role === 'ADMIN' || session.role === 'CASHIER'))
        ? (session.branch || 'Tagoloan')
        : (branchParam === 'all' ? undefined : (branchParam || undefined));

    const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];

    const where: any = {};
    if (condition === 'pre-owned' || condition === 'Pre-Owned') {
      where.isPreOwned = true;
    } else if (condition === 'new' || condition === 'New') {
      where.isPreOwned = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { specs: { contains: search, mode: 'insensitive' } },
        { variations: { some: { productId: { contains: search, mode: 'insensitive' } } } },
        { variations: { some: { name: { contains: search, mode: 'insensitive' } } } }
      ];
    }

    if (brand && brand !== 'All Brands') {
      where.name = {
        ...(where.name || {}),
        contains: brand,
        mode: 'insensitive'
      };
    }

    const categoryId = searchParams.get('categoryId') || '';
    if (categoryId && categoryId !== 'All' && categoryId !== 'All Categories') {
      where.categoryId = categoryId;
    }

    if (activeBranch) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { branch: { equals: activeBranch, mode: 'insensitive' } },
            { branchStocks: { some: { branch: { equals: activeBranch, mode: 'insensitive' }, stock: { gt: 0 } } } },
            { variations: { some: { branchStocks: { some: { branch: { equals: activeBranch, mode: 'insensitive' }, stock: { gt: 0 } } } } } }
          ]
        }
      ];
    }

    const rawDevices = await prisma.device.findMany({
      where,
      include: {
        category: true,
        variations: {
          include: {
            branchStocks: true
          }
        },
        branchStocks: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Format devices with rich multi-branch variant breakdowns
    let formattedDevices = rawDevices
      .map((device) => {
        const devVariations = (device.variations || []).map((v) => {
          const prodId = v.productId || formatProductId(device.name, v.name);
          const branchStockMap: Record<string, number> = {
            Tagoloan: 0,
            Villanueva: 0,
            Jasaan: 0
          };

          (v.branchStocks || []).forEach((bs) => {
            if (bs.branch) {
              branchStockMap[bs.branch] = bs.stock;
            }
          });

          const totalVariantStock = Object.values(branchStockMap).reduce((sum, s) => sum + s, 0);
          const currentBranchVariantStock = activeBranch ? (branchStockMap[activeBranch] ?? 0) : totalVariantStock;

          return {
            id: v.id,
            type: v.type || 'Storage',
            name: v.name,
            productId: prodId,
            price: v.price,
            cost: v.cost,
            stock: currentBranchVariantStock,
            totalStock: totalVariantStock,
            branchStocks: branchStockMap,
            tagoloanStock: branchStockMap.Tagoloan || 0,
            villanuevaStock: branchStockMap.Villanueva || 0,
            jasaanStock: branchStockMap.Jasaan || 0,
            isOutOfStock: currentBranchVariantStock === 0,
            isLowStock: currentBranchVariantStock > 0 && currentBranchVariantStock < 5
          };
        });

        // Compute device-level branch stock
        const devBranchStockMap: Record<string, number> = {
          Tagoloan: 0,
          Villanueva: 0,
          Jasaan: 0
        };

        branches.forEach((b) => {
          if (devVariations.length > 0) {
            devBranchStockMap[b] = devVariations.reduce((sum, v) => sum + (v.branchStocks[b] || 0), 0);
          } else {
            const bs = (device.branchStocks || []).find((s) => s.branch === b);
            devBranchStockMap[b] = bs ? bs.stock : (device.branch === b ? device.stock : 0);
          }
        });

        const totalDeviceStock = Object.values(devBranchStockMap).reduce((sum, s) => sum + s, 0);
        const activeBranchStock = activeBranch ? (devBranchStockMap[activeBranch] ?? 0) : totalDeviceStock;
        const belongsToActiveBranch = !activeBranch || (device.branch && device.branch.toLowerCase() === activeBranch.toLowerCase()) || activeBranchStock > 0;

        return {
          ...device,
          stock: activeBranchStock,
          totalStock: totalDeviceStock,
          branchStockMap: devBranchStockMap,
          tagoloanStock: devBranchStockMap.Tagoloan || 0,
          villanuevaStock: devBranchStockMap.Villanueva || 0,
          jasaanStock: devBranchStockMap.Jasaan || 0,
          isOutOfStock: activeBranchStock === 0,
          isLowStock: activeBranchStock > 0 && activeBranchStock < 5,
          belongsToActiveBranch,
          variations: devVariations
        };
      })
      .filter((device) => {
        if (activeBranch) {
          return device.belongsToActiveBranch;
        }
        return true;
      });

    // Stock Status filter ('low' | 'out')
    if (stockStatus === 'low') {
      formattedDevices = formattedDevices.filter(d => d.isLowStock);
    } else if (stockStatus === 'out') {
      formattedDevices = formattedDevices.filter(d => d.isOutOfStock);
    }

    // Type filter
    if (typeFilter && typeFilter !== 'all') {
      formattedDevices = formattedDevices.filter(p => {
        const pName = (p.name || '').toLowerCase();
        const pSpecs = (p.specs || '').toLowerCase();
        const pCat = (p.category?.name || '').toLowerCase();

        if (typeFilter === 'smartphone') {
          const isPhoneWord = pName.includes('phone') || pName.includes('mobile') || pName.includes('smartphone') || 
                              pSpecs.includes('phone') || pSpecs.includes('mobile') ||
                              pCat.includes('phone') || pCat.includes('mobile') || pCat.includes('smartphone');
          
          const isPhoneBrand = ['apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'infinix', 'itel', 'huawei', 'oneplus'].some(b => 
            pName.includes(b) || pCat.includes(b)
          );

          const isAccessory = pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                              pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                              pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                              pName.includes('keyboard') || pName.includes('mouse') || pName.includes('tempered') ||
                              pCat.includes('accessories') || pCat.includes('peripherals');
                              
          const isIpadOrLaptop = pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || 
                                 pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') ||
                                 pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('laptop');

          return (isPhoneWord || isPhoneBrand) && !isAccessory && !isIpadOrLaptop;
        } 
        else if (typeFilter === 'laptop') {
          return pName.includes('laptop') || pName.includes('macbook') || pName.includes('notebook') || 
                 pName.includes('thinkpad') || pName.includes('zenbook') || pName.includes('chromebook') ||
                 pSpecs.includes('laptop') || pSpecs.includes('macbook') || pSpecs.includes('notebook') ||
                 pCat.includes('laptop') || pCat.includes('macbook');
        } 
        else if (typeFilter === 'ipad') {
          return pName.includes('ipad') || pName.includes('tablet') || pName.includes('tab') || pName.includes('pad') ||
                 pSpecs.includes('ipad') || pSpecs.includes('tablet') || pSpecs.includes('tab') ||
                 pCat.includes('ipad') || pCat.includes('tablet') || pCat.includes('tab');
        } 
        else if (typeFilter === 'tv') {
          return pName.includes('tv') || pName.includes('television') || pName.includes('smart tv') || pName.includes('led tv') ||
                 pSpecs.includes('tv') || pSpecs.includes('television') ||
                 pCat.includes('tv') || pCat.includes('television');
        } 
        else if (typeFilter === 'speaker') {
          return pName.includes('speaker') || pName.includes('audio') || pName.includes('soundbar') || pName.includes('subwoofer') ||
                 pSpecs.includes('speaker') || pSpecs.includes('audio') ||
                 pCat.includes('speaker') || pCat.includes('audio');
        } 
        else if (typeFilter === 'phone accessories') {
          return pName.includes('case') || pName.includes('charger') || pName.includes('cable') || 
                 pName.includes('earphone') || pName.includes('headset') || pName.includes('buds') || 
                 pName.includes('watch') || pName.includes('peripherals') || pName.includes('accessories') ||
                 pName.includes('tempered') || pName.includes('powerbank') || pName.includes('hub') ||
                 pCat.includes('accessories') || pCat.includes('peripherals');
        }
        return true;
      });
    }

    if (pageStr) {
      const page = Math.max(1, parseInt(pageStr, 10) || 1);
      const limit = Math.max(1, parseInt(limitStr || '15', 10) || 15);
      const skip = (page - 1) * limit;
      const total = formattedDevices.length;
      const paginated = formattedDevices.slice(skip, skip + limit);

      return NextResponse.json({
        devices: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
        }
      });
    }

    return NextResponse.json(formattedDevices, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
      }
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = session.role === 'SUPER_ADMIN';
    const formData = await req.formData();
    const customBranch = formData.get('branch') as string;

    const operatingBranch = isSuperAdmin
      ? (customBranch && customBranch !== 'all' ? customBranch : 'Tagoloan')
      : (session.branch || 'Tagoloan');

    const name = formData.get('deviceName') as string;
    const priceStr = formData.get('devicePrice') as string;
    const costStr = formData.get('deviceCost') as string;
    const stockStr = formData.get('deviceStocks') as string;
    const categoryId = formData.get('deviceCategory') as string;
    const specs = formData.get('deviceSpecs') as string;
    const asLowAs = formData.get('deviceAsLowAs') as string;
    const warranty = formData.get('deviceWarranty') as string;
    const downpayment = formData.get('deviceDownpayment') as string;
    const imagesForm = formData.getAll('deviceImages') as File[];
    const singleImage = formData.get('deviceImage') as File | null;
    const downpaymentFormImage = formData.get('deviceDownpaymentImage') as File | null;
    const variationsStr = formData.get('variations') as string;

    const type = (formData.get('deviceType') as string) || (formData.get('type') as string) || 'Smartphone';
    const isPreOwned = formData.get('isPreOwned') === 'true';

    let variations: any[] = [];
    if (variationsStr) {
      try {
        variations = JSON.parse(variationsStr);
      } catch (e) { }
    }

    if (!name || !priceStr || !costStr || !stockStr || !categoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const filesToUpload = (imagesForm.length > 0 ? imagesForm : (singleImage ? [singleImage] : [])).slice(0, 5);
    let imageUrls: string[] = [];

    if (filesToUpload.length > 0) {
      for (const file of filesToUpload) {
        if (file && file.name && file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const imageUrl = await uploadToCloudinary(buffer, 'devices');
          imageUrls.push(imageUrl);
        }
      }
    }

    const primaryImage = imageUrls.length > 0 ? imageUrls[0] : null;

    let downpaymentImageUrl = null;
    if (downpaymentFormImage && downpaymentFormImage.name && downpaymentFormImage.size > 0) {
      const buffer = Buffer.from(await downpaymentFormImage.arrayBuffer());
      downpaymentImageUrl = await uploadToCloudinary(buffer, 'devices/downpayments');
    }

    const discountStr = (formData.get('deviceDiscount') as string) || (formData.get('discount') as string) || '0';
    const discount = Math.max(0, Math.min(100, parseFloat(discountStr) || 0));

    const discountStartDateStr = (formData.get('discountStartDate') as string) || null;
    const discountEndDateStr = (formData.get('discountEndDate') as string) || null;
    const discountStartDate = discountStartDateStr ? new Date(discountStartDateStr) : null;
    const discountEndDate = discountEndDateStr ? new Date(discountEndDateStr) : null;

    const branches = ['Tagoloan', 'Villanueva', 'Jasaan'];

    const device = await prisma.$transaction(async (tx) => {
      // Check if product already exists to avoid duplication (Section 17)
      const existingDevice = await tx.device.findFirst({
        where: {
          name: { equals: name.trim(), mode: 'insensitive' },
          isPreOwned: isPreOwned
        },
        include: {
          variations: true,
          branchStocks: true
        }
      });

      // Validate that none of the Product IDs collide with other devices
      if (variations.length > 0) {
        for (const v of variations) {
          const prodId = formatProductId(name, v.name, v.productId);
          const duplicateVar = await tx.deviceVariation.findFirst({
            where: {
              productId: { equals: prodId, mode: 'insensitive' },
              ...(existingDevice ? { deviceId: { not: existingDevice.id } } : {})
            }
          });
          if (duplicateVar) {
            throw new Error(`Product ID "${prodId}" already exists. Please use a unique Product ID.`);
          }
        }
      }

      if (existingDevice) {
        // Product already exists: synchronize variations and branch inventory
        let addedTotalStock = 0;

        if (variations.length > 0) {
          for (const v of variations) {
            const prodId = formatProductId(name, v.name, v.productId);
            const varStock = parseInt(v.stock || 0, 10);

            // Compute branch stock values
            const tagStock = isSuperAdmin 
              ? (v.tagoloanStock !== undefined ? parseInt(v.tagoloanStock, 10) : (operatingBranch === 'Tagoloan' ? varStock : 0))
              : (operatingBranch === 'Tagoloan' ? (parseInt(v.tagoloanStock ?? v.stock ?? 0, 10)) : 0);

            const vilStock = isSuperAdmin
              ? (v.villanuevaStock !== undefined ? parseInt(v.villanuevaStock, 10) : (operatingBranch === 'Villanueva' ? varStock : 0))
              : (operatingBranch === 'Villanueva' ? (parseInt(v.villanuevaStock ?? v.stock ?? 0, 10)) : 0);

            const jasStock = isSuperAdmin
              ? (v.jasaanStock !== undefined ? parseInt(v.jasaanStock, 10) : (operatingBranch === 'Jasaan' ? varStock : 0))
              : (operatingBranch === 'Jasaan' ? (parseInt(v.jasaanStock ?? v.stock ?? 0, 10)) : 0);

            const branchStockValues: Record<string, number> = {
              Tagoloan: isNaN(tagStock) ? 0 : tagStock,
              Villanueva: isNaN(vilStock) ? 0 : vilStock,
              Jasaan: isNaN(jasStock) ? 0 : jasStock
            };

            const allocatedStock = isSuperAdmin ? (tagStock + vilStock + jasStock) : (branchStockValues[operatingBranch] || 0);
            addedTotalStock += allocatedStock;

            // Check if this specific variation exists on the device
            let existingVar = existingDevice.variations.find(
              ev => (ev.name && v.name && ev.name.toLowerCase() === v.name.toLowerCase()) ||
                    (ev.productId && prodId && ev.productId.toUpperCase() === prodId.toUpperCase())
            );

            if (existingVar) {
              // Update price/cost and add stock
              await tx.deviceVariation.update({
                where: { id: existingVar.id },
                data: {
                  price: parseFloat(v.price || priceStr),
                  cost: parseFloat(v.cost || costStr),
                  stock: { increment: allocatedStock }
                }
              });

              // Update branch stocks
              for (const b of branches) {
                const existingBs = await tx.branchStock.findFirst({
                  where: {
                    deviceId: existingDevice.id,
                    variationId: existingVar.id,
                    branch: b
                  }
                });

                if (existingBs) {
                  const stockToAdd = isSuperAdmin ? (branchStockValues[b] || 0) : (b === operatingBranch ? (branchStockValues[b] || 0) : 0);
                  if (stockToAdd > 0) {
                    await tx.branchStock.update({
                      where: { id: existingBs.id },
                      data: {
                        stock: { increment: stockToAdd }
                      }
                    });
                  }
                } else {
                  await tx.branchStock.create({
                    data: {
                      deviceId: existingDevice.id,
                      variationId: existingVar.id,
                      branch: b,
                      productId: prodId,
                      stock: branchStockValues[b] || 0,
                      sold: 0
                    }
                  });
                }
              }
            } else {
              // Create new variant on existing device
              const createdVar = await tx.deviceVariation.create({
                data: {
                  deviceId: existingDevice.id,
                  type: v.type || 'Storage',
                  name: v.name,
                  productId: prodId,
                  price: parseFloat(v.price || priceStr),
                  cost: parseFloat(v.cost || costStr),
                  stock: allocatedStock
                }
              });

              for (const b of branches) {
                await tx.branchStock.create({
                  data: {
                    deviceId: existingDevice.id,
                    variationId: createdVar.id,
                    branch: b,
                    productId: prodId,
                    stock: branchStockValues[b] || 0,
                    sold: 0
                  }
                });
              }
            }
          }
        } else {
          // Standard item without capacity variations
          const defaultProdId = formatProductId(name, 'STD');
          const totalStock = parseInt(stockStr, 10);
          addedTotalStock += totalStock;

          let existingVar = existingDevice.variations.find(ev => ev.name === 'Standard' || ev.productId === defaultProdId);
          if (existingVar) {
            await tx.deviceVariation.update({
              where: { id: existingVar.id },
              data: {
                stock: { increment: totalStock },
                price: parseFloat(priceStr),
                cost: parseFloat(costStr)
              }
            });

            const existingBs = await tx.branchStock.findFirst({
              where: {
                deviceId: existingDevice.id,
                variationId: existingVar.id,
                branch: operatingBranch
              }
            });

            if (existingBs) {
              await tx.branchStock.update({
                where: { id: existingBs.id },
                data: { stock: { increment: totalStock } }
              });
            } else {
              await tx.branchStock.create({
                data: {
                  deviceId: existingDevice.id,
                  variationId: existingVar.id,
                  branch: operatingBranch,
                  productId: defaultProdId,
                  stock: totalStock,
                  sold: 0
                }
              });
            }
          } else {
            const createdVar = await tx.deviceVariation.create({
              data: {
                deviceId: existingDevice.id,
                type: 'Model',
                name: 'Standard',
                productId: defaultProdId,
                price: parseFloat(priceStr),
                cost: parseFloat(costStr),
                stock: totalStock
              }
            });

            for (const b of branches) {
              const bStock = b === operatingBranch ? totalStock : 0;
              await tx.branchStock.create({
                data: {
                  deviceId: existingDevice.id,
                  variationId: createdVar.id,
                  branch: b,
                  productId: defaultProdId,
                  stock: bStock,
                  sold: 0
                }
              });
            }
          }
        }

        // Update existing device aggregate stock
        const updatedDevice = await tx.device.update({
          where: { id: existingDevice.id },
          data: {
            stock: { increment: addedTotalStock },
            ...(specs ? { specs } : {}),
            ...(primaryImage ? { image: primaryImage } : {}),
            ...(imageUrls.length > 0 ? { images: imageUrls } : {})
          }
        });

        return updatedDevice;
      }

      // New product creation
      const createdDevice = await tx.device.create({
        data: {
          name,
          price: parseFloat(priceStr),
          cost: parseFloat(costStr),
          stock: parseInt(stockStr, 10),
          branch: operatingBranch,
          type,
          discount,
          discountStartDate,
          discountEndDate,
          isPreOwned,
          ...(categoryId ? { category: { connect: { id: categoryId } } } : {}),
          specs: specs || null,
          image: primaryImage,
          images: imageUrls,
          downpaymentImage: downpaymentImageUrl,
          asLowAs: asLowAs || null,
          warranty: warranty || null,
          downpayment: downpayment || null
        }
      });

      if (variations.length > 0) {
        for (const v of variations) {
          const prodId = formatProductId(name, v.name, v.productId);
          const varStock = parseInt(v.stock || 0, 10);
          
          // Branch stock allocation
          const tagStock = isSuperAdmin
            ? (v.tagoloanStock !== undefined ? parseInt(v.tagoloanStock, 10) : (operatingBranch === 'Tagoloan' ? varStock : 0))
            : (operatingBranch === 'Tagoloan' ? (parseInt(v.tagoloanStock ?? v.stock ?? 0, 10)) : 0);

          const vilStock = isSuperAdmin
            ? (v.villanuevaStock !== undefined ? parseInt(v.villanuevaStock, 10) : (operatingBranch === 'Villanueva' ? varStock : 0))
            : (operatingBranch === 'Villanueva' ? (parseInt(v.villanuevaStock ?? v.stock ?? 0, 10)) : 0);

          const jasStock = isSuperAdmin
            ? (v.jasaanStock !== undefined ? parseInt(v.jasaanStock, 10) : (operatingBranch === 'Jasaan' ? varStock : 0))
            : (operatingBranch === 'Jasaan' ? (parseInt(v.jasaanStock ?? v.stock ?? 0, 10)) : 0);

          const branchStockValues: Record<string, number> = {
            Tagoloan: isNaN(tagStock) ? 0 : tagStock,
            Villanueva: isNaN(vilStock) ? 0 : vilStock,
            Jasaan: isNaN(jasStock) ? 0 : jasStock
          };

          const allocatedStock = isSuperAdmin ? (tagStock + vilStock + jasStock) : (branchStockValues[operatingBranch] || 0);

          const createdVar = await tx.deviceVariation.create({
            data: {
              deviceId: createdDevice.id,
              type: v.type || 'Storage',
              name: v.name,
              productId: prodId,
              price: parseFloat(v.price || priceStr),
              cost: parseFloat(v.cost || costStr),
              stock: allocatedStock
            }
          });

          for (const b of branches) {
            await tx.branchStock.create({
              data: {
                deviceId: createdDevice.id,
                variationId: createdVar.id,
                branch: b,
                productId: prodId,
                stock: branchStockValues[b] || 0,
                sold: 0
              }
            });
          }
        }
      } else {
        // Standard item without capacity variations
        const defaultProdId = formatProductId(name, 'STD');
        const totalStock = parseInt(stockStr, 10);
        const createdVar = await tx.deviceVariation.create({
          data: {
            deviceId: createdDevice.id,
            type: 'Model',
            name: 'Standard',
            productId: defaultProdId,
            price: parseFloat(priceStr),
            cost: parseFloat(costStr),
            stock: totalStock
          }
        });

        for (const b of branches) {
          const bStock = b === operatingBranch ? totalStock : 0;
          await tx.branchStock.create({
            data: {
              deviceId: createdDevice.id,
              variationId: createdVar.id,
              branch: b,
              productId: defaultProdId,
              stock: bStock,
              sold: 0
            }
          });
        }
      }

      return createdDevice;
    });

    await logActivity({
      action: 'ADD_DEVICE',
      description: `Added/synchronized product '${name}' with multi-branch variant support (Stock: ${stockStr})`,
      branch: operatingBranch,
      userId: session.userId,
      userRole: session.role
    });

    await triggerStockAlert({ deviceId: device.id });

    return NextResponse.json(device, { status: 201 });
  } catch (error: any) {
    console.error('Error creating device:', error);
    return NextResponse.json({ error: error?.message || 'Failed to create device' }, { status: 400 });
  }
}
