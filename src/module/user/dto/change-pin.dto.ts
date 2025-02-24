import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class changePinDto{
    @IsNumber()
    @IsNotEmpty()
    newPin: number;

    @IsNumber()
    @IsNotEmpty()
    oldPin: number;


}

export class pinDto{
     @ApiProperty({ description: 'Change Pin', required: true })
    @IsNumber()
    pin: number
    
    @IsNumber()
    confirm_pin:number
}

export class testFundDto{
    @IsString()
    username: string;
    
    @IsNumber()
    amount:number
}