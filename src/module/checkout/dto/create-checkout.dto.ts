export class CreateCheckoutDto {
  products: { code: string; quantity: number }[];
  discount?: number;
  tax?: number;
}
