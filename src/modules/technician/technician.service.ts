import prisma from '../../lib/prisma';
import { Prisma } from '../../../prisma/generated/index.js';
import { TTechnicianFilters } from './technician.interface';

const getAllTechnicians = async (filters: TTechnicianFilters) => {
  const { categoryId, location, search } = filters;

  const where: Prisma.TechnicianProfileWhereInput = {};

  if (location) {
    where.location = { contains: location, mode: 'insensitive' };
  }

  if (categoryId) {
    where.services = { some: { categoryId: Number(categoryId) } };
  }

  if (search) {
    where.OR = [
      { bio: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return prisma.technicianProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      services: { include: { category: true } },
    },
  });
};

const getTechnicianById = async (id: number) => {
  return prisma.technicianProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      services: { include: { category: true } },
      // reviews will be included here once the Reviews module is built
    },
  });
};

export const TechnicianService = {
  getAllTechnicians,
  getTechnicianById,
};