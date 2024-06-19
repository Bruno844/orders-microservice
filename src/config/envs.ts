import 'dotenv/config';
import * as joi from 'joi'


interface EnvVariables {
    PORT: number;
    
}

const envSchema = joi.object({
    PORT: joi.number().required(),
   
})
.unknown(true);

const {error, value} = envSchema.validate(process.env);

if(error){
    throw new Error(`config validation error: ${error.message}`);
}

const envVars: EnvVariables = value;


export const envs = {
    port: envVars.PORT
   
}