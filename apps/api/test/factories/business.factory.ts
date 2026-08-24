import type { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export async function createBusinessFixture(prisma: PrismaClient, companyId: string) {
  const suffix = randomUUID().slice(0, 8);
  const document = Array.from(suffix)
    .map((character) => character.charCodeAt(0) % 10)
    .join('')
    .padEnd(14, '0');
  const category = await prisma.category.create({
    data: {
      companyId,
      name: `Category ${suffix}`,
      normalizedName: `category-${suffix}`,
    },
  });
  const unit = await prisma.unitOfMeasure.create({
    data: {
      companyId,
      name: `Unit ${suffix}`,
      normalizedName: `unit-${suffix}`,
      symbol: `U${suffix}`,
      normalizedSymbol: `u${suffix}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      companyId,
      categoryId: category.id,
      unitId: unit.id,
      name: `Product ${suffix}`,
      sku: `SKU-${suffix.toUpperCase()}`,
      costPrice: '5.00',
      salePrice: '10.00',
    },
  });
  const supplier = await prisma.supplier.create({
    data: {
      companyId,
      type: 'COMPANY',
      name: `Supplier ${suffix}`,
      document,
    },
  });
  const customer = await prisma.customer.create({
    data: {
      companyId,
      type: 'COMPANY',
      name: `Customer ${suffix}`,
      document,
      creditLimit: '10000.00',
    },
  });
  const warehouse = await prisma.warehouse.create({
    data: { companyId, name: `Warehouse ${suffix}`, code: `W-${suffix.toUpperCase()}` },
  });
  const location = await prisma.stockLocation.create({
    data: { companyId, warehouseId: warehouse.id, code: 'A-01' },
  });
  const destinationWarehouse = await prisma.warehouse.create({
    data: { companyId, name: `Destination ${suffix}`, code: `D-${suffix.toUpperCase()}` },
  });
  const destinationLocation = await prisma.stockLocation.create({
    data: { companyId, warehouseId: destinationWarehouse.id, code: 'B-01' },
  });

  return {
    category,
    unit,
    product,
    supplier,
    customer,
    warehouse,
    location,
    destinationWarehouse,
    destinationLocation,
  };
}
