import prisma from '../../lib/prisma';
import { Prisma } from '../../../prisma/generated/index.js';
import { TServiceFilters } from './service.interface';

const getAllServices = async (filters: TServiceFilters) => {
  const { categoryId, location, minPrice, maxPrice, search } = filters;

  const where: Prisma.ServiceWhereInput = {};

  if (categoryId) {
    where.categoryId = Number(categoryId);
  }

  if (location) {
    where.technician = {
      location: { contains: location, mode: Prisma.QueryMode.insensitive },
    };
  }

  if (minPrice || maxPrice) {
    where.price = {
      ...(minPrice ? { gte: Number(minPrice) } : {}),
      ...(maxPrice ? { lte: Number(maxPrice) } : {}),
    };
  }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: Prisma.QueryMode.insensitive } },
      { description: { contains: search, mode: Prisma.QueryMode.insensitive } },
    ];
  }

  return prisma.service.findMany({
    where,
    include: {
      category: true,
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const getServiceById = async (id: number) => {
  return prisma.service.findUnique({
    where: { id },
    include: {
      category: true,
      technician: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
  });
};

export const ServiceService = {
  getAllServices,
  getServiceById,
};