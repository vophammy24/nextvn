import { MenuCategoryRepo, MenuItemRepo } from '../../lib/repositories.js';

export async function getCategories(branchId: string) {
  return MenuCategoryRepo.findMany({
    where: { branchId, isActive: true },
    orderBy: { displayOrder: 'asc' },
  });
}

export async function getCategoryById(id: string, branchId: string) {
  return MenuCategoryRepo.findFirst({
    where: { id, branchId },
  });
}

export async function createCategory(data: {
  branchId: string;
  name: string;
  displayOrder?: number;
}) {
  return MenuCategoryRepo.create({
    data: {
      branchId: data.branchId,
      name: data.name,
      displayOrder: data.displayOrder ?? 0,
      isActive: true,
    },
  });
}

export interface MenuItemFilters {
  branchId: string;
  categoryId?: string;
  search?: string;
  activeOnly?: boolean;
}

export async function getMenuItems(filters: MenuItemFilters) {
  const where: Record<string, unknown> = { branchId: filters.branchId };

  if (filters.categoryId) {
    where['categoryId'] = filters.categoryId;
  }
  if (filters.activeOnly !== false) {
    where['isActive'] = true;
  }

  const items: Array<{ name: string; [key: string]: unknown }> = await MenuItemRepo.findMany({
    where,
    include: { category: true },
    orderBy: { name: 'asc' },
  });

  if (filters.search) {
    const term = filters.search.toLowerCase();
    return items.filter((item) => item.name.toLowerCase().includes(term));
  }

  return items;
}

export async function getMenuItemById(id: string, branchId: string) {
  return MenuItemRepo.findFirst({
    where: { id, branchId },
  });
}

export async function createMenuItem(data: {
  branchId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}) {
  return MenuItemRepo.create({
    data: {
      branchId: data.branchId,
      categoryId: data.categoryId,
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      imageUrl: data.imageUrl ?? null,
      isActive: true,
    },
  });
}

export async function getMenuItemsByIds(ids: string[], branchId: string) {
  const items: Array<{ id: string; [key: string]: unknown }> = await MenuItemRepo.findMany({
    where: { branchId, isActive: true },
  });
  return items.filter((item) => ids.includes(item.id));
}
