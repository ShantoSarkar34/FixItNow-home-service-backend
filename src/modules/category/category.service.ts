import httpStatus from "http-status";
import prisma from "../../lib/prisma.js";
import ApiError from "../../utils/ApiError.js";
import { TCreateCategoryPayload } from "./category.interface.js";

const createCategory = async (payload: TCreateCategoryPayload) => {
  if (!payload.name) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Category name is required");
  }

  const existing = await prisma.category.findUnique({
    where: { name: payload.name },
  });

  if (existing) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "A category with this name already exists"
    );
  }

  return prisma.category.create({ data: payload });
};

const updateCategory = async (
  id: number,
  payload: { name?: string; description?: string }
) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  if (payload.name) {
    const duplicate = await prisma.category.findFirst({
      where: {
        name: { equals: payload.name },
        NOT: { id },
      },
    });
    if (duplicate) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "A category with this name already exists"
      );
    }
  }

  return prisma.category.update({
    where: { id },
    data: {
      name: payload.name,
      description: payload.description,
    },
  });
};

const deleteCategory = async (id: number) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  const servicesUsingCategory = await prisma.service.count({
    where: { categoryId: id },
  });
  if (servicesUsingCategory > 0) {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Cannot delete this category — services are currently assigned to it"
    );
  }

  await prisma.category.delete({ where: { id } });
  return null;
};

const getSingleCategories = async (id: number) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError(httpStatus.NOT_FOUND, "Category not found");
  }

  return prisma.category.findUnique({ where: { id } });
};

const getAllCategories = async () => {
  return prisma.category.findMany({ orderBy: { name: "asc" } });
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getSingleCategories,
  updateCategory,
  deleteCategory,
};
