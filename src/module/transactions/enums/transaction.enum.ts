export enum TransactionStatus {
  SUCCESS = 'success',
  CANCELLED = 'cancelled',
  SUCCESSFUL = 'SUCCESSFUL',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

export enum TransactionType {
  TRANSFER = 'transfer',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  AIRTIME_RECHARGE = 'Airtime Recharge',
  ELECTRICITY_PAYMENT = 'Electricity Payment',
  WAEC_RESULT_CHECKER = 'WAEC Result Checker',
  TV_PRODUCT_PURCHASE = 'TV Product Purchase',
  WAEC_PIN_PURCHASE = 'WAEC Pin Purchase',
  SMILE_BUNDLE_PURCHASE = 'Smile Boundle Purchase',
}

export enum TransactionOperations {
  CREDIT = 'credit',
  DEBIT = 'debit',
}

//   export enum TransactionTypes {
//     WITHDRAWAL = "withdrawal",
//     DEPOSIT = "deposit",
//     TRANSFER = "transfer",
//   }
