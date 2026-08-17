import { Request, Response } from 'express';
import { Consultation } from '../models/Consultation';

export const createConsultation = async (req: Request, res: Response) => {
  try {
    const consultation = new Consultation(req.body);
    await consultation.save();
    res.status(201).json({
      success: true,
      data: consultation,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create consultation request',
    });
  }
};

export const getConsultations = async (req: Request, res: Response) => {
  try {
    const { status, source, search, startDate, endDate, page, limit } = req.query;

    const filter: any = {};

    if (status && status !== 'all') {
      filter.status = new RegExp(`^${String(status).trim()}$`, 'i');
    }

    if (source && source !== 'all') {
      filter.source = new RegExp(`^${String(source).trim()}$`, 'i');
    }

    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { business: searchRegex },
        { serviceName: searchRegex },
        { source: searchRegex },
      ];
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(String(startDate));
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(String(endDate));
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    const pageNum = page ? Math.max(1, parseInt(String(page), 10) || 1) : 1;
    const limitNum = limit ? Math.max(1, parseInt(String(limit), 10) || 10) : 10;

    const total = await Consultation.countDocuments(filter);
    const sources = await Consultation.distinct('source');

    let query = Consultation.find(filter).sort({ createdAt: -1 });

    if (limitNum > 0) {
      const skip = (pageNum - 1) * limitNum;
      query = query.skip(skip).limit(limitNum);
    }

    const consultations = await query.exec();

    res.status(200).json({
      success: true,
      data: consultations,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: limitNum > 0 ? Math.ceil(total / limitNum) : 1,
      sources: sources.filter(Boolean),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch consultations',
    });
  }
};

export const updateConsultationStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Pending', 'Contacted', 'Resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const consultation = await Consultation.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found',
      });
    }

    res.status(200).json({
      success: true,
      data: consultation,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update consultation status',
    });
  }
};
