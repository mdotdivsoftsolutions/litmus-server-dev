import Test from '../models/Test';
import Category from '../models/Category';
import Package from '../models/Package';
import Product from '../models/Product';

export class SearchService {
  static async getSuggestions(query: string) {
    if (!query || query.trim() === '') return [];

    const regex = new RegExp(query, 'i');
    
    // Search concurrently
    const [tests, categories, packages, products] = await Promise.all([
      Test.find({ testName: regex }).limit(5).select('testName _id'),
      Category.find({ name: regex }).limit(3).select('name _id'),
      Package.find({ name: regex }).limit(3).select('name _id'),
      Product.find({ name: regex }).limit(3).select('name _id')
    ]);

    const suggestions: any[] = [];
    
    tests.forEach((t: any) => suggestions.push({ id: t._id, name: t.testName, type: 'test' }));
    categories.forEach((c: any) => suggestions.push({ id: c._id, name: c.name, type: 'category' }));
    packages.forEach((p: any) => suggestions.push({ id: p._id, name: p.name, type: 'package' }));
    products.forEach((p: any) => suggestions.push({ id: p._id, name: p.name, type: 'product' }));

    return suggestions;
  }
}
