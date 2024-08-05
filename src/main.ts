import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config/envs';
import { Logger, ValidationPipe } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {

  const logger = new Logger('ORDERS-MAIN')

  //aca siempre configuramos para que este backend sea un microservicio,lo pasamos a un microservicio
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule,{
    transport: Transport.NATS,
    options:{
      servers: envs.natsServers
    }
  });


  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true
    }),
  );


  
  await app.listen();
  logger.log(' ORDERS-MICROSERVICE server running in' + envs.port)



}
bootstrap();
