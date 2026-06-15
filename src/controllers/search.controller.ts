import { Request, Response } from 'express';
import { SearchService } from '../services/search.service';
import logger from '../utils/logger';

export class SearchController {
  static async getSuggestions(req: Request, res: Response): Promise<void> {
    try {
      const query = req.query.q as string;
      const suggestions = await SearchService.getSuggestions(query);
      res.status(200).json({ success: true, data: suggestions });
    } catch (error: any) {
      logger.error(`SearchSuggestions Error: ${error.message}`);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}
