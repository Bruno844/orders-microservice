import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { NATS_SERVICE, PRODUCT_SERVICE } from 'src/config/services';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger('OrdersServices')

  constructor(@Inject(NATS_SERVICE) private readonly client: ClientProxy) {
    super();
  }


  //aca conectamos con la base de datos que hayamos configurado con prisma
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected')
  }



  async create(createOrderDto: CreateOrderDto) {
    try {

      //confirmar los ids de los productos
      const prodIds = createOrderDto.items.map(item => item.productId)
      const prod: any[] = await firstValueFrom(
        this.client.send({ cmd: 'validate_products' }, prodIds)
      )

      //2.Calculos de los valores
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = prod.find(product => product.id === orderItem.productId).price

        return price + orderItem.quantity

      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0)

      //3. Crear transaccion de base de datos
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: prod.find(product => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              })),
            },
          },
        },
        include: {
          OrderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });

      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: prod.find(product => product.id === orderItem.productId).name
        }))
      }


    } catch (error) {
      throw new RpcException({
        status: HttpStatus.BAD_REQUEST,
        message: 'check logs'
      })
    }
  }



  async findAll(orderPaginationDto: OrderPaginationDto) {

    const totalPages = await this.order.count({
      where: {
        status: orderPaginationDto.status
      }
    });

    const currentPage = orderPaginationDto.page;

    const perPage = orderPaginationDto.limit

    return {
      data: await this.order.findMany({
        skip: (currentPage - 1) * perPage,
        take: perPage,
        where: {
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


    const order = await this.order.findFirst({
      where: {
        id: id
      },
      include: {
        OrderItem: {
          select: {
            price: true,
            quantity: true,
            productId: true
          }
        }
      }
    })

    if(!order){
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with id ${id} not found`
      })
    }

    const prodIds = order.OrderItem.map(orderItem => orderItem.productId)
    const prod: any[] = await firstValueFrom(
      this.client.send({ cmd: 'validate_products' }, prodIds)
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map((orderItem) => ({
        ...orderItem,
        name: prod.find((product) => product.id === orderItem.productId).name,
      }))
    }

  }




  async changeStatus(changeOrderStatus: ChangeOrderStatusDto) {

    const { id, status } = changeOrderStatus

    const order = await this.findOne(id);
    //preguntamos si el status de la orden que queremos actualizar, es igual al argumento que le mandamos
    //que no actualice, si no que solo muestre, de esa manera no esta actualizandose constantemente
    if (order.status === status) {
      return order
    }



    //actualizamos el status de la orden
    return this.order.update({
      where: { id },
      data: {
        status: status
      }
    })


  }


}
