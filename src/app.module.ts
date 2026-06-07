import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config/envs';
import { InvoicesModule } from './invoices/invoices.module';
import { ExtractsModule } from './extracts/extracts.module';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: () => {
        return {
          uri: envs.MONGO_URI,
        };
      },
    }),
    InvoicesModule,
    ExtractsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
