import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Package from '../src/models/Package';
import Test from '../src/models/Test';
import User from '../src/models/User';
import Category from '../src/models/Category';

const packageData = [
  {
    name: "Basic Nutritional Testing",
    description: "Basic nutritional profiling for Internal Quality Checks- Ideal for startups, home-grown brands, restaurants, cloud kitchens, and food manufacturers seeking basic nutritional information for product development, internal quality checks, or preliminary labeling requirements. Suitable for products that do not require detailed nutrient declarations.",
    numParams: 5,
    parameters: ["Energy", "Protein", "Carbohydrates", "Total Fat", "Moisture"],
    minCost: 3000,
    maxCost: 4000
  },
  {
    name: "Complete Nutritional Testing",
    description: "Food Label Compliance Package-Recommended for food manufacturers, exporters, private-label brands, and businesses requiring complete nutritional labeling in accordance with regulatory requirements. Suitable for products sold through retail channels, e-commerce platforms, supermarkets, and export markets.",
    numParams: 14,
    parameters: ["Energy", "Protein", "Carbohydrates", "Total Sugars", "Added Sugars", "Total Fat", "Saturated Fat", "Trans Fat", "Dietary Fiber", "Sodium", "Cholesterol", "Iron", "Calcium", "Potassium"],
    minCost: 7000,
    maxCost: 9000
  },
  {
    name: "Basic Microbial Testing",
    description: "Screening for common microbial contamination- Designed for food businesses seeking routine quality and hygiene monitoring. Suitable for restaurants, bakeries, snack manufacturers, cloud kitchens, and small-scale food producers looking to assess general microbiological quality and identify potential contamination risks.",
    numParams: 5,
    parameters: ["Total Plate Count (TPC)", "Yeast & Mold Count", "Coliforms", "E. coli", "Enterobacteriaceae"],
    minCost: 3000,
    maxCost: 4000
  },
  {
    name: "Complete Microbial Testing",
    description: "Comprehensive microbiological safety assessment- Intended for manufacturers of ready-to-eat foods, dairy products, beverages, frozen foods, nutraceuticals, and export products requiring comprehensive food safety verification. Helps demonstrate compliance with regulatory and customer food safety requirements.",
    numParams: 8,
    parameters: ["TPC", "Yeast & Mold", "Coliforms", "E. coli", "Salmonella", "Staphylococcus aureus", "Bacillus cereus", "Listeria monocytogenes", "Clostridium spp. (as applicable)"],
    minCost: 8000,
    maxCost: 10000
  },
  {
    name: "Heavy Metal Testing",
    description: "Detection of toxic heavy metals-Recommended for manufacturers of health foods, baby foods, spices, herbal products, nutraceuticals, dietary supplements, beverages, and export products. Helps identify contamination from raw materials, processing equipment, water sources, or environmental exposure.",
    numParams: 8,
    parameters: ["Lead (Pb)", "Arsenic (As)", "Cadmium (Cd)", "Mercury (Hg)", "Tin", "Chromium", "Nickel", "Copper (as required)"],
    minCost: 5000,
    maxCost: 8000
  },
  {
    name: "Aflatoxin Testing",
    description: "Detection of aflatoxin contamination-Particularly important for products susceptible to fungal contamination such as spices, nuts, dry fruits, cereals, grains, oilseeds, animal feed, and herbal products. Suitable for manufacturers seeking regulatory compliance and export certification.",
    numParams: 4,
    parameters: ["Aflatoxin B1", "B2", "G1", "G2 (Total Aflatoxins)"],
    minCost: 4000,
    maxCost: 8000
  },
  {
    name: "Pesticide Analysis",
    description: "Multi-residue pesticide screening-Recommended for agricultural products, spices, fruits, vegetables, grains, tea, coffee, herbs, nutraceutical ingredients, and export consignments. Essential for businesses needing compliance with FSSAI, international standards, retailer specifications, or export regulations.",
    numParams: 100,
    parameters: ["Multi-Residue Pesticide Screening including Organophosphates", "Organochlorines", "Pyrethroids", "Carbamates", "and other regulated pesticide residues"],
    minCost: 10000,
    maxCost: 40000
  },
  {
    name: "Shelf Life Study - Accelerated",
    description: "Stability study to determine product shelf life-Suitable for food manufacturers launching new products, reformulating existing products, validating packaging effectiveness, or determining product expiry dates. Recommended for products requiring scientific shelf-life validation for regulatory compliance, customer assurance, and market distribution planning.",
    numParams: 10,
    parameters: ["Periodic testing of Moisture", "pH", "Water Activity", "TPC", "Yeast & Mold", "Sensory Evaluation", "Packaging Integrity", "Nutritional Stability"],
    minCost: 20000,
    maxCost: 100000
  },
  {
    name: "Basic Water Testing",
    description: "Routine drinking water monitoring-Suitable for households, residential societies, offices, restaurants, schools, hospitals, and food businesses seeking a preliminary assessment of water quality. Recommended for routine monitoring of drinking water, borewell water, tanker water, or RO-treated water to identify basic quality and safety concerns.",
    numParams: 8,
    parameters: ["pH", "Turbidity", "TDS", "Total Hardness", "Alkalinity", "Chloride", "Nitrate", "Iron", "Residual Chlorine", "Total Coliforms (as applicable)"],
    minCost: 4000,
    maxCost: 8000
  },
  {
    name: "Complete IS 10500 Water Testing",
    description: "Food businesses requiring potable water verification- Comprehensive drinking water quality assessment as per the requirements of IS 10500. Recommended for food businesses (restaurants, cloud kitchens, food manufacturers, bakeries, etc.) are expected to ensure that water used in food preparation is potable (drinking quality). Suitable for verifying the safety and suitability of potable water.",
    numParams: 25,
    parameters: ["pH", "Turbidity", "TDS", "Hardness", "Alkalinity", "Chloride", "Sulphate", "Nitrate", "Fluoride", "Iron", "Manganese", "Heavy Metals", "Total Coliforms", "E. coli", "and other physical, chemical, and pesticide residues as specified under IS 10500"],
    minCost: 10000,
    maxCost: 20000
  },
  {
    name: "Complete IS 14543 Water Testing",
    description: "Packaged drinking water manufacturers-Designed for packaged drinking water manufacturers seeking compliance with IS 14543 and certification requirements. Recommended for bottled water plants, packaged drinking water units, and businesses undergoing regulatory inspections, product validation, or certification audits. Ensures compliance with BIS and food safety requirements for packaged drinking water.",
    numParams: 35,
    parameters: ["Physical", "Chemical", "Toxic Substance", "Microbiological", "Organoleptic", "and Pesticide Residue Parameters including pH", "TDS", "Nitrate", "Fluoride", "Heavy Metals", "Total Coliforms", "E. coli", "Pseudomonas aeruginosa", "Yeast & Mold", "and other parameters specified under IS 14543"],
    minCost: 15000,
    maxCost: 25000
  },
  {
    name: "Complete Allergen Testing",
    description: "For facilities handling multiple product categories or shared production lines.-Recommended for food manufacturers, bakeries, confectionery producers, nutraceutical companies, restaurants, cloud kitchens, and exporters requiring allergen declaration, allergen-free claims, or cross-contamination verification. This package helps identify the presence of regulated food allergens, supports labeling compliance, protects sensitive consumers, and demonstrates adherence to customer and regulatory requirements. Particularly valuable for facilities handling multiple product categories or shared production lines.",
    numParams: 1,
    parameters: ["Peanut", "Tree Nuts (Almond, Cashew, Walnut, etc.)", "Milk", "Egg", "Soy", "Wheat/Gluten", "Sesame", "Mustard", "Fish", "Crustaceans", "Molluscs", "Celery", "Lupin", "Sulphites (as applicable)"],
    minCost: 15000,
    maxCost: 25000
  },
  {
    name: "Complete Toxin Testing",
    description: "Screening for naturally occurring toxins, Especially For export products-Designed for food manufacturers, exporters, spice processors, grain and cereal producers, nut and dry fruit processors, animal feed manufacturers, and nutraceutical companies seeking to assess product safety and regulatory compliance. This package screens for naturally occurring toxins, fungal toxins, plant toxins, and process contaminants that may pose health risks or affect market acceptance. Recommended for products with higher contamination risk or export requirements.",
    numParams: 5,
    parameters: ["Aflatoxins (B1, B2, G1, G2)", "Ochratoxin A", "Patulin", "Fumonisins", "Deoxynivalenol (DON)", "Zearalenone", "T-2 & HT-2 Toxins", "Citrinin", "Ergot Alkaloids", "Histamine", "Cyanide", "Solanine", "Pyrrolizidine Alkaloids", "Acrylamide", "3-MCPD", "Glycidyl Esters (as applicable)"],
    minCost: 35000,
    maxCost: 50000
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI is missing in .env");
    }

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    // Find an Admin user
    const admin = await User.findOne({ role: 'ADMIN' as any });
    if (!admin) {
      throw new Error("No ADMIN user found in DB. Please create one first.");
    }
    console.log("Using Admin User:", admin._id);

    // Find any Category
    let category = await Category.findOne();
    if (!category) {
      category = new Category({
        name: `Testing Packages ${Date.now()}`,
        description: 'Testing packages from sheet'
      });
      await category.save();
    }
    console.log("Using Category:", category._id);

    for (const pkgData of packageData) {
      console.log(`Processing package: ${pkgData.name}`);
      
      const testIds: any[] = [];

      // Create Tests (Parameters)
      for (const param of pkgData.parameters) {
        let test = await Test.findOne({ testName: param });
        if (!test) {
          test = new Test({
            testName: param,
            description: `Testing parameter for ${param}`,
            price: Math.floor(pkgData.minCost / pkgData.numParams) || 500, // dummy price
            turnAroundTime: "3-5 Days", // dummy tat
            creatorType: 'ADMIN',
            approvalStatus: 'APPROVED'
          });
          await test.save();
        }
        testIds.push(test._id);
      }

      // Create Package
      const existingPkg = await Package.findOne({ name: pkgData.name });
      if (!existingPkg) {
        const pkg = new Package({
          name: pkgData.name,
          description: pkgData.description,
          testCount: pkgData.numParams,
          price: pkgData.minCost,
          mrp: pkgData.maxCost,
          tat: "3-5 Days", // dummy tat
          category: category.name,
          categoryId: category._id,
          tests: testIds,
          createdBy: admin._id,
          approvalStatus: 'APPROVED',
          discountType: 'PERCENTAGE',
          discountValue: 0
        });
        await pkg.save();
        console.log(`-> Package created: ${pkgData.name}`);
      } else {
        console.log(`-> Package already exists: ${pkgData.name}`);
      }
    }

    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  }
}

seed();
