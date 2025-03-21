import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length, MaxLength, MinLength } from "class-validator";
import { UserRoleEnum } from "src/common/enums/user.enum";

export class SupplyDto{

    @ApiProperty({ description: 'The email of the user' })
     @IsEmail()
     email: string;
   
     @ApiProperty({ description: 'The phone number of the user', required: false })
     @IsOptional()
     @IsString()
     @Length(10, 11)
     phone: string;
   
   
     @ApiProperty({ description: 'The first name of the user' })
     @IsString()
     @MinLength(1)
     @MaxLength(20)
     firstName: string;
   
     @ApiProperty({ description: 'The last name of the user' })
     @IsString()
     @MinLength(2)
     @MaxLength(20)
     lastName: string;
   
     metadata?: { userId: string };
   
     @ApiProperty({ description: 'The country of the user' })
     @IsString()
     @IsNotEmpty()
     country: string; // e.g., "Nigeria"
   
     @ApiProperty({ description: 'The state of the user' })
     @IsString()
     @IsNotEmpty()
     state: string;
   
     @ApiProperty({ description: 'The local government area of the user' })
     @IsString()
     @IsNotEmpty()
     city: string;
   
     @ApiProperty({ description: 'The currency of the user' })
     @IsString()
     @IsOptional()
     @IsString()
     extraMobile: string;
     
     @ApiProperty({ description: 'The last area of the user' })
     @IsString()
     @IsOptional()
     area: string;
   
     @ApiProperty({ description: 'The business type of the user', required: false }) // Make it optional if needed
     @IsString()
     @IsOptional() // If business type is not always required
     supplierType?: string; // e.g., "Retail", "Wholesale", "Services"

}