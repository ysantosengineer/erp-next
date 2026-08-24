import { Module } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { InventoryCountsController } from './inventory-counts.controller';
import { InventoryCountsService } from './inventory-counts.service';

@Module({
  controllers: [InventoryCountsController],
  providers: [InventoryService, InventoryCountsService],
  exports: [InventoryCountsService],
})
export class InventoryCountsModule {}
