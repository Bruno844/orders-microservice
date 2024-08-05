import 'dotenv/config';
import * as joi from 'joi'


interface EnvVariables {
    PORT: number;
    //PRODUCTS_MICROSERVICE_HOST: string;
    //PRODUCTS_MICROSERVICE_PORT: number;
    NATS_SERVERS: string[]
    
}

const envSchema = joi.object({
    PORT: joi.number().required(),
    //PRODUCTS_MICROSERVICE_HOST: joi.string().required(),
    //PRODUCTS_MICROSERVICE_PORT:  joi.number().required()
    NATS_SERVERS: joi.array().items(joi.string()).required()
})
.unknown(true);

const {error, value} = envSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});

if(error){
    throw new Error(`config validation error: ${error.message}`);
}

const envVars: EnvVariables = value;


export const envs = {
    port: envVars.PORT,
    natsServers: envVars.NATS_SERVERS
    //prodMicroservideHost: envVars.PRODUCTS_MICROSERVICE_HOST,
    //prodMicroservicePort: envVars.PRODUCTS_MICROSERVICE_PORT,
   
}