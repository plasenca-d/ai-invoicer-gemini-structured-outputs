import { Module } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Vendor, VendorSchema } from './entities/vendor.entity';
import { Invoice, InvoiceSchema } from './entities/invoice.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Vendor.name,
        schema: VendorSchema,
      },
      {
        name: Invoice.name,
        schema: InvoiceSchema,
      },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}
