import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import {
  PurchaseOrderReceivableController,
  PurchaseReceiptsController,
} from './purchase-receipts.controller';
import { PurchaseReceiptsService } from './purchase-receipts.service';

@Module({
  imports: [InventoryModule],
  controllers: [PurchaseReceiptsController, PurchaseOrderReceivableController],
  providers: [PurchaseReceiptsService],
  exports: [PurchaseReceiptsService],
})
export class PurchaseReceiptsModule {}
