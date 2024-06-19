import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersServices')


  //aca conectamos con la base de datos que hayamos configurado con prisma
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected')  
  }



  async create(createOrderDto: CreateOrderDto) {
    try {
      
      return await this.order.create({
        data: createOrderDto
      })


    } catch (error) {
        
    }
  }

  async findAll(orderPaginationDto:OrderPaginationDto) {
    
    const totalPages = await this.order.count({
      where:{
        status: orderPaginationDto.status
      }
    });

    const currentPage = orderPaginationDto.page;

    const perPage = orderPaginationDto.limit
    
    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where:{
          status: orderPaginationDto.status
        }
      }),
      meta: {
        total: totalPages,
        page: currentPage,
        lastPage: Math.ceil(totalPages / perPage) 
      }
    }
  }

  async findOne(id: string) {
    try {

      return await this.order.findFirst({
        where: {
          id : id
        }
      })
      
    } catch (error) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`
      })
    }
  }

  async changeStatus(changeOrderStatus: ChangeOrderStatusDto){

    const {id, status} = changeOrderStatus

    const order = await this.findOne(id);
    //preguntamos si el status de la orden que queremos actualizar, es igual al argumento que le mandamos
    //que no actualice, si no que solo muestre, de esa manera no esta actualizandose constantemente
    if(order.status === status){
      return order
    }



    //actualizamos el status de la orden
    return this.order.update({
      where: {id},
      data: {
        status: status
      }
    })


  }

  
}
