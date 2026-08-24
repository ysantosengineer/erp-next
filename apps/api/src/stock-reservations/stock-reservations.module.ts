import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { StockReservationsController } from './stock-reservations.controller';
import { StockReservationsService } from './stock-reservations.service';

@Module({
  imports: [InventoryModule],
  controllers: [StockReservationsController],
  providers: [StockReservationsService],
  exports: [StockReservationsService],
})
export class StockReservationsModule {}
