import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class changePinDto{
    @ApiProperty({ description: 'Change Pin', required: true })
    @IsNumber()
    @IsNotEmpty()
    newPin: number;

    @ApiProperty({ description: 'Old Pin', required: true })
    @IsNumber()
    @IsNotEmpty()
    oldPin: number;


}

export class pinDto{
     @ApiProperty({ description: 'Change Pin', required: true })
    @IsNumber()
    pin: number
    
    @ApiProperty({ description: 'Confirm Pin', required: true })
    @IsNumber()
    confirmPin:number
}

export class testFundDto{
    @IsString()
    username: string;
    
    @IsNumber()
    amount:number
}