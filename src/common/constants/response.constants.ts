export const RESPONSE_CONSTANT = {
  AUTH: {
    REGISTER_SUCCESS:
      'Registration Successful, check email for account verification code',
    LOGIN_SUCCESS: 'Login Successful',
    EMAIL_VERIFICATION_SUCCESS: 'Email verified successfully',
    PASSWORD_RESET_EMAIL_SUCCESS: 'Password Reset Email Sent Successfully',
    PASSWORD_RESET_SUCCESS: 'Password Reset Successfully',
    REFRESH_TOKEN_SUCCESS: 'Token Successfully Refreshed',
    LOGOUT_SUCCESS: 'You have Successfully Logged out from the app',
  },
  OTP: {
    OTP_VALID: 'OTP Valid',
  },
  USER: {
    GET_CURRENT_USER_SUCCESS: 'Records Retrieved Successfully',
    UPDATE_USER_PROFILE_SUCCESS: 'Profile Successfully Updated',
    CHANGE_USER_PIN: 'Pin changed successful',
  },
  INTEREST: {
    CREATED_SUCCESS: 'Interest Created Successfully',
    UPDATED_SUCCESS: 'Interest Updated Successfully',
    GET_ALL_INTEREST__SUCCESS: 'Interests Retrieved Successfully',
  },
  CHECKOUT: {
    SCAN_PRODUCT: 'Product Scanned Successfully',
    CHECKOUT_SUCCESS: 'Checkout Successfully created',
    UPDATE_ORDER_STATUS: 'Order updated successfully',
  },
  AIRTIME: {
    AIRTIME_PURCHASE_SUCCESS: 'Airtime Recharge Successful',
  },
  PRODUCTS: {
    GET_ALL_PRODUCT: 'You have got to see all products here cheers !!!',
    ADD_PRODUCT: 'Yo have Succesfully added a product cheers !!!',
    UPDATE_PRODUCT: 'Product updated successfully',
    BOUGUET_RENEWAL: 'Bouguet Change Successful',
  },
  WALLET: {
    WALLET_TOPUP_SUCCESS: 'Wallet Topup Successful',
    WALLET_WITHDRAWAL_SUCCESS: 'Wallet Withdrawal Successful',
    WALLET_VERIFY_SUCCESS: 'Wallet Transaction Verified Successfully',
  },
  BILL: {
    PAY_FOR_AIRTIME: 'Airtime Purchase Successful',
    PAY_FOR_TV: 'Television Purchase Successful',
    ELECTRICITY: 'Electricity Bill Paid successfully',
    ELECTRICITY_SMART_CARD: 'Eletricity Smart Card verify Successfully',
  },
  TRANSACTION: {
    TRANSFER_SUCCESSFUL: 'Transfer Successful',
  },
};

export const PAYSTACK_CREATE_CUSTOMER = 'https://api.paystack.co/customer';
export const TITAN = 'titan-paystack';
