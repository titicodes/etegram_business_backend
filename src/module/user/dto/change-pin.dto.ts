import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class changePinDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    newPin: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    oldPin: string;
}

export class pinDto {
    @ApiProperty()
    @IsString()
    pin: string;

    @ApiProperty()
    @IsString()
    confirmPin: string;
}


export class testFundDto {
    @IsString()
    username: string;

    @IsNumber()
    amount: number
}