import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import ApiError from '../../utils/ApiError';
import { TechnicianService } from './technician.service';
import { TTechnicianFilters } from './technician.interface';

const getAllTechnicians = catchAsync(async (req: Request, res: Response) => {
  const technicians = await TechnicianService.getAllTechnicians(
    req.query as unknown as TTechnicianFilters,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technicians retrieved successfully',
    data: technicians,
  });
});

const getTechnicianById = catchAsync(async (req: Request, res: Response) => {
  const technician = await TechnicianService.getTechnicianById(Number(req.params.id));

  if (!technician) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Technician not found');
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Technician retrieved successfully',
    data: technician,
  });
});

export const TechnicianController = {
  getAllTechnicians,
  getTechnicianById,
};