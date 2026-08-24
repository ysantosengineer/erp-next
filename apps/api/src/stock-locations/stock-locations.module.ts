import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { StockLocationsController } from './stock-locations.controller';
import { StockLocationsService } from './stock-locations.service';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [StockLocationsController],
  providers: [StockLocationsService],
})
export class StockLocationsModule {}
