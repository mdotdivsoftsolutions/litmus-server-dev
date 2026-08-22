import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import bcrypt from 'bcrypt';
import Category from '../models/Category';
import Test from '../models/Test';
import Package from '../models/Package';
import Laboratory from '../models/Laboratory';
import User from '../models/User';
import { UserRole } from '../types';

interface ImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; item?: string; reason: string }[];
}

/**
 * Robust helper to extract rows from an Excel worksheet.
 * Detects header row dynamically, ignores instruction rows and required/optional indicator rows.
 */
function extractRowsFromSheet(sheet: XLSX.WorkSheet, keyFieldCandidates: string[]): any[] {
  const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!rawRows || rawRows.length === 0) return [];

  // Find the header row index
  let headerRowIndex = -1;
  for (let i = 0; i < rawRows.length; i++) {
    const rowStr = rawRows[i].map((c) => String(c).trim().toLowerCase());
    const matches = keyFieldCandidates.some((k) => rowStr.includes(k.toLowerCase()));
    if (matches) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    // Default to first row
    headerRowIndex = 0;
  }

  const rawHeaders = rawRows[headerRowIndex].map((h) => String(h).trim());
  const dataRows: any[] = [];

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    // Check if it's the indicator row (e.g. REQUIRED / OPTIONAL)
    const rowJoined = row.map((c) => String(c).trim().toUpperCase()).join(' ');
    if (rowJoined.includes('REQUIRED') || rowJoined.includes('OPTIONAL')) {
      continue;
    }

    // Check if entire row is empty
    const hasData = row.some((c) => String(c).trim() !== '');
    if (!hasData) continue;

    const rowObj: any = { _rowNumber: r + 1 };
    rawHeaders.forEach((header, colIdx) => {
      if (header) {
        rowObj[header] = row[colIdx] !== undefined ? String(row[colIdx]).trim() : '';
      }
    });

    dataRows.push(rowObj);
  }

  return dataRows;
}

// 1. IMPORT CATEGORIES
export const processCategoriesImport = async (dataRows: any[]): Promise<ImportSummary> => {
  const summary: ImportSummary = { totalRows: dataRows.length, created: 0, updated: 0, failed: 0, errors: [] };

  for (const row of dataRows) {
    const name = row.name || row.categoryName || row['Category Name'];
    if (!name) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, reason: 'Category name is required' });
      continue;
    }

    try {
      const description = row.description || row.Description || '';
      const imageUrl = row.imageUrl || row.image || row['Image URL'] || '';

      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (existing) {
        existing.description = description || existing.description;
        if (imageUrl) existing.imageUrl = imageUrl;
        await existing.save();
        summary.updated++;
      } else {
        await Category.create({
          name: name.trim(),
          description: description.trim(),
          imageUrl: imageUrl.trim() || undefined,
        });
        summary.created++;
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, item: name, reason: err.message || 'Database error' });
    }
  }

  return summary;
};

// 2. IMPORT TESTS
export const processTestsImport = async (dataRows: any[]): Promise<ImportSummary> => {
  const summary: ImportSummary = { totalRows: dataRows.length, created: 0, updated: 0, failed: 0, errors: [] };

  // Cache all categories for fast lookup
  const allCategories = await Category.find({}, '_id name');
  const catMap = new Map<string, string>();
  allCategories.forEach((c) => catMap.set(c.name.toLowerCase().trim(), c._id.toString()));

  // Cache labs
  const allLabs = await Laboratory.find({}, '_id labName');
  const labMap = new Map<string, string>();
  allLabs.forEach((l) => labMap.set(l.labName.toLowerCase().trim(), l._id.toString()));

  for (const row of dataRows) {
    const testName = row.testName || row.name || row['Test Name'];
    if (!testName) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, reason: 'Test name is required' });
      continue;
    }

    try {
      // Parse parameters: "Name:Unit:Min:Max:Price; Name2:Unit:Min:Max:Price"
      const rawParams = row.parameters || row.testParameters || row['Parameters'] || '';
      let parameters: any[] = [];

      if (rawParams) {
        const paramEntries = String(rawParams).split(';');
        for (const entry of paramEntries) {
          const parts = entry.split(':').map((p) => p.trim());
          if (parts.length >= 5) {
            parameters.push({
              name: parts[0],
              unit: parts[1],
              minLimit: parts[2],
              maxLimit: parts[3],
              price: Number(parts[4]) || 0,
            });
          } else if (parts.length === 2) {
            parameters.push({
              name: parts[0],
              unit: '',
              minLimit: '',
              maxLimit: '',
              price: Number(parts[1]) || 0,
            });
          } else if (parts.length === 1 && parts[0]) {
            parameters.push({
              name: parts[0],
              unit: '',
              minLimit: '',
              maxLimit: '',
              price: 0,
            });
          }
        }
      }

      // Default fallback parameter if empty
      if (parameters.length === 0) {
        const directPrice = Number(row.price || row.basePrice || 0);
        parameters = [{ name: 'Standard Parameter', unit: '', minLimit: '', maxLimit: '', price: directPrice }];
      }

      // Calculate base price from parameters
      const basePrice = parameters.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

      // Turn around time parsing
      let turnAroundTime = row.turnAroundTime || row.tat || row['Turn Around Time'] || '';
      if (turnAroundTime) {
        const tatLower = String(turnAroundTime).toLowerCase();
        const numMatch = tatLower.match(/\d+/);
        if (numMatch) {
          const num = parseInt(numMatch[0]);
          if (tatLower.includes('day') || tatLower.includes('d')) {
            turnAroundTime = `${num * 24}hr`;
          } else {
            turnAroundTime = `${num}hr`;
          }
        }
      }

      // Discount calculation
      const discountType = ['FLAT', 'PERCENTAGE'].includes(String(row.discountType).toUpperCase())
        ? String(row.discountType).toUpperCase()
        : 'NONE';
      const discountValue = Number(row.discountValue || 0);
      let offerPrice: number | undefined = undefined;

      if (discountType === 'FLAT' && discountValue > 0) {
        offerPrice = Math.max(0, basePrice - discountValue);
      } else if (discountType === 'PERCENTAGE' && discountValue > 0) {
        offerPrice = Math.max(0, basePrice - basePrice * (discountValue / 100));
      }

      // Category applicability
      const isApplicableToAllStr = String(row.isApplicableToAll || 'true').toLowerCase();
      const isApplicableToAll = isApplicableToAllStr === 'true' || isApplicableToAllStr === '1';

      const applicableCategoryIds: string[] = [];
      if (!isApplicableToAll && row.applicableCategories) {
        const catNames = String(row.applicableCategories).split(',').map((c) => c.trim().toLowerCase());
        for (const cn of catNames) {
          const matchedId = catMap.get(cn);
          if (matchedId) applicableCategoryIds.push(matchedId);
        }
      }

      // Creator & Lab
      const creatorType = String(row.creatorType).toUpperCase() === 'LAB' ? 'LAB' : 'ADMIN';
      let labId: string | undefined = undefined;
      if (creatorType === 'LAB' && row.labName) {
        labId = labMap.get(String(row.labName).toLowerCase().trim());
      }

      const isPopularStr = String(row.isPopular || 'false').toLowerCase();
      const isPopular = isPopularStr === 'true' || isPopularStr === '1';

      const existingTest = await Test.findOne({ testName: { $regex: new RegExp(`^${testName.trim()}$`, 'i') } });

      const testPayload: any = {
        testName: testName.trim(),
        description: (row.description || '').trim(),
        imageUrl: (row.imageUrl || row.icon || '').trim() || undefined,
        icon: (row.icon || row.imageUrl || '').trim() || undefined,
        price: basePrice,
        offerPrice: offerPrice,
        discountType: discountType,
        discountValue: discountValue,
        turnAroundTime: turnAroundTime || undefined,
        isPopular: isPopular,
        isApplicableToAll: isApplicableToAll,
        applicableCategories: applicableCategoryIds,
        creatorType: creatorType,
        labId: labId || undefined,
        approvalStatus: 'APPROVED',
        metadata: {
          method: (row.fssaiMethod || row.method || '').trim(),
          type: (row.testType || row.type || 'Chemical').trim(),
          parameters: parameters,
        },
      };

      if (existingTest) {
        await Test.findByIdAndUpdate(existingTest._id, testPayload);
        summary.updated++;
      } else {
        await Test.create(testPayload);
        summary.created++;
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, item: testName, reason: err.message || 'Database error' });
    }
  }

  return summary;
};

// 3. IMPORT PACKAGES
export const processPackagesImport = async (dataRows: any[], defaultAdminId?: string): Promise<ImportSummary> => {
  const summary: ImportSummary = { totalRows: dataRows.length, created: 0, updated: 0, failed: 0, errors: [] };

  // Cache categories
  const allCategories = await Category.find({}, '_id name');
  const catMap = new Map<string, { id: string; name: string }>();
  allCategories.forEach((c) => catMap.set(c.name.toLowerCase().trim(), { id: c._id.toString(), name: c.name }));

  // Cache tests
  const allTests = await Test.find({}, '_id testName price offerPrice metadata');
  const testMap = new Map<string, any>();
  allTests.forEach((t) => testMap.set(t.testName.toLowerCase().trim(), t));

  // Find a fallback admin user
  let fallbackAdminId = defaultAdminId;
  if (!fallbackAdminId) {
    const adminUser = await User.findOne({ role: UserRole.ADMIN });
    fallbackAdminId = adminUser?._id?.toString();
  }

  for (const row of dataRows) {
    const name = row.name || row.packageName || row['Package Name'];
    if (!name) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, reason: 'Package name is required' });
      continue;
    }

    try {
      const categoryRaw = row.category || row.categoryName || row['Category'];
      const matchedCat = catMap.get(String(categoryRaw || '').toLowerCase().trim());
      if (!matchedCat) {
        summary.failed++;
        summary.errors.push({ row: row._rowNumber, item: name, reason: `Category '${categoryRaw}' not found in database` });
        continue;
      }

      // Parse tests
      const testsRaw = row.tests || row['Tests'] || '';
      const testNames = String(testsRaw).split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      const testIds: string[] = [];
      let calculatedMrp = 0;
      let totalParamsCount = 0;

      for (const tn of testNames) {
        const foundTest = testMap.get(tn);
        if (foundTest) {
          testIds.push(foundTest._id.toString());
          calculatedMrp += foundTest.offerPrice || foundTest.price || 0;
          totalParamsCount += foundTest.metadata?.parameters?.length || 1;
        }
      }

      if (testIds.length === 0) {
        summary.failed++;
        summary.errors.push({ row: row._rowNumber, item: name, reason: 'At least one valid test must be specified for the package' });
        continue;
      }

      const mrp = Number(row.mrp) > 0 ? Number(row.mrp) : calculatedMrp;
      const price = Number(row.price || row.sellingPrice || 0);
      const tat = row.tat || row.turnAroundTime || '48 Hours';

      // Parse features: Semicolon or comma separated
      const rawFeatures = row.features || row['Features'] || '';
      const features = rawFeatures
        ? String(rawFeatures)
            .split(';')
            .map((f) => f.trim())
            .filter(Boolean)
        : [];

      const discountType = ['PERCENTAGE', 'FLAT'].includes(String(row.discountType).toUpperCase())
        ? String(row.discountType).toUpperCase()
        : 'PERCENTAGE';
      const discountValue = Number(row.discountValue || 0);

      const pkgPayload: any = {
        name: name.trim(),
        description: (row.description || 'Comprehensive laboratory testing package.').trim(),
        categoryId: matchedCat.id,
        category: matchedCat.name,
        tests: testIds,
        testCount: totalParamsCount || testIds.length,
        mrp: mrp,
        discountType: discountType,
        discountValue: discountValue,
        price: price > 0 ? price : mrp,
        tat: tat,
        tag: (row.tag || '').trim() || undefined,
        features: features,
        image: (row.image || row.imageUrl || '').trim() || undefined,
        createdBy: fallbackAdminId,
        approvalStatus: 'APPROVED',
      };

      const existingPkg = await Package.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } });
      if (existingPkg) {
        await Package.findByIdAndUpdate(existingPkg._id, pkgPayload);
        summary.updated++;
      } else {
        await Package.create(pkgPayload);
        summary.created++;
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, item: name, reason: err.message || 'Database error' });
    }
  }

  return summary;
};

// 4. IMPORT LABORATORIES
export const processLaboratoriesImport = async (dataRows: any[]): Promise<ImportSummary> => {
  const summary: ImportSummary = { totalRows: dataRows.length, created: 0, updated: 0, failed: 0, errors: [] };

  for (const row of dataRows) {
    const labName = row.labName || row.name || row['Laboratory Name'];
    const email = row.contactEmail || row.email || row['Contact Email'];
    const phone = row.contactPhone || row.phone || row['Contact Phone'];
    const city = row.city || row['City'];
    const state = row.state || row['State'];

    if (!labName || !email || !city || !state) {
      summary.failed++;
      summary.errors.push({
        row: row._rowNumber,
        item: labName || 'Unknown',
        reason: 'Laboratory Name, Contact Email, City, and State are required',
      });
      continue;
    }

    try {
      const normalizedEmail = String(email).trim().toLowerCase();

      // Find or create User account for this Lab
      let user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        const plainPassword = row.password || 'Litmus@2026';
        user = await User.create({
          firstName: labName.trim(),
          email: normalizedEmail,
          phone: phone ? String(phone).trim() : '9999999999',
          password: plainPassword,
          role: UserRole.LAB,
          customerSegment: 'LAB_PARTNER',
        });
      }

      // Parse booleans
      const parseBool = (val: any) => {
        if (typeof val === 'boolean') return val;
        const str = String(val || '').toLowerCase();
        return str === 'true' || str === '1' || str === 'yes';
      };

      const expertiseArea = row.expertiseArea
        ? String(row.expertiseArea)
            .split(',')
            .map((e) => e.trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];

      const serviceAreaLogistics = row.serviceAreaLogistics
        ? String(row.serviceAreaLogistics)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];

      const labPayload: any = {
        labName: labName.trim(),
        userId: user._id,
        contactEmail: normalizedEmail,
        contactPhone: phone ? String(phone).trim() : undefined,
        startingYear: Number(row.startingYear) || undefined,
        isNablAccredited: parseBool(row.isNablAccredited),
        nablAccreditationNumber: (row.nablAccreditationNumber || '').trim() || undefined,
        isFssaiApproved: parseBool(row.isFssaiApproved),
        isTrusted: parseBool(row.isTrusted),
        isAutoBooking: parseBool(row.isAutoBooking),
        location: {
          address: (row.address || '').trim(),
          city: city.trim(),
          state: state.trim(),
          lat: row.lat ? String(row.lat).trim() : '',
          lng: row.lng ? String(row.lng).trim() : '',
        },
        overview: (row.overview || '').trim(),
        employeeCount: Number(row.employeeCount) || 0,
        accuracyRate: Number(row.accuracyRate) || undefined,
        testsConducted: Number(row.testsConducted) || 0,
        activityStatus: (row.activityStatus || 'Operational Now').trim(),
        expertiseArea: expertiseArea,
        serviceAreaLogistics: serviceAreaLogistics,
        additionalDetails: (row.additionalDetails || '').trim(),
        isActive: true,
      };

      const existingLab = await Laboratory.findOne({
        $or: [{ contactEmail: normalizedEmail }, { labName: { $regex: new RegExp(`^${labName.trim()}$`, 'i') } }],
      });

      if (existingLab) {
        await Laboratory.findByIdAndUpdate(existingLab._id, labPayload);
        summary.updated++;
      } else {
        await Laboratory.create(labPayload);
        summary.created++;
      }
    } catch (err: any) {
      summary.failed++;
      summary.errors.push({ row: row._rowNumber, item: labName, reason: err.message || 'Database error' });
    }
  }

  return summary;
};

// CONTROLLERS
export const importCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'No Excel file provided' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('cat')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = extractRowsFromSheet(sheet, ['name', 'categoryName']);

    const summary = await processCategoriesImport(rows);
    res.status(200).json({ success: true, message: 'Categories import completed', summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process Categories import' });
  }
};

export const importTests = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'No Excel file provided' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('test')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = extractRowsFromSheet(sheet, ['testName', 'name']);

    const summary = await processTestsImport(rows);
    res.status(200).json({ success: true, message: 'Tests import completed', summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process Tests import' });
  }
};

export const importPackages = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'No Excel file provided' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('pack')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = extractRowsFromSheet(sheet, ['name', 'category', 'tests']);

    const adminId = (req as any).user?.id || (req as any).user?._id;
    const summary = await processPackagesImport(rows, adminId);
    res.status(200).json({ success: true, message: 'Packages import completed', summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process Packages import' });
  }
};

export const importLaboratories = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'No Excel file provided' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('lab')) || workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = extractRowsFromSheet(sheet, ['labName', 'contactEmail', 'city']);

    const summary = await processLaboratoriesImport(rows);
    res.status(200).json({ success: true, message: 'Laboratories import completed', summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process Laboratories import' });
  }
};

// MASTER IMPORT: Detects and imports all sheets in proper sequence
export const importMaster = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.file.buffer) {
      res.status(400).json({ success: false, message: 'No Excel file provided' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const results: Record<string, ImportSummary> = {};

    // 1. Categories sheet
    const catSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('cat'));
    if (catSheetName) {
      const catRows = extractRowsFromSheet(workbook.Sheets[catSheetName], ['name', 'categoryName']);
      results['categories'] = await processCategoriesImport(catRows);
    }

    // 2. Tests sheet
    const testSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('test'));
    if (testSheetName) {
      const testRows = extractRowsFromSheet(workbook.Sheets[testSheetName], ['testName', 'name']);
      results['tests'] = await processTestsImport(testRows);
    }

    // 3. Packages sheet
    const pkgSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('pack'));
    if (pkgSheetName) {
      const pkgRows = extractRowsFromSheet(workbook.Sheets[pkgSheetName], ['name', 'category', 'tests']);
      const adminId = (req as any).user?.id || (req as any).user?._id;
      results['packages'] = await processPackagesImport(pkgRows, adminId);
    }

    // 4. Laboratories sheet
    const labSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('lab'));
    if (labSheetName) {
      const labRows = extractRowsFromSheet(workbook.Sheets[labSheetName], ['labName', 'contactEmail', 'city']);
      results['laboratories'] = await processLaboratoriesImport(labRows);
    }

    res.status(200).json({
      success: true,
      message: 'Master import completed across all detected sheets',
      results,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to process Master import' });
  }
};
