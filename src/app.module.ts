import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { envs } from './config/envs';
import { InvoicesModule } from './invoices/invoices.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
