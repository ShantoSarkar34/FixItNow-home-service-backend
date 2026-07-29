import { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync.js";
import sendResponse from "../../utils/sendResponse.js";
import { CategoryService } from "./category.service.js";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.createCategory(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: category,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const categories = await CategoryService.getAllCategories();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: categories,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const category = await CategoryService.updateCategory(
    Number(req.params.id),
    req.body
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: category,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  await CategoryService.deleteCategory(Number(req.params.id));

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: null,
  });
});

const getSingleCategory = catchAsync(async (req: Request, res: Response) => {
  const singleCategory = await CategoryService.getSingleCategories(
    Number(req.params.id)
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data: singleCategory,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getSingleCategory,
  updateCategory,
  deleteCategory,
};
