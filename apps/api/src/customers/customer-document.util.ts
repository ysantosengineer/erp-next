import { CustomerType } from '@prisma/client';
import { isValidCnpj, isValidCpf } from '../common/utils/br-document.util';

export { digitsOnly, isValidCnpj, isValidCpf } from '../common/utils/br-document.util';

export const isValidCustomerDocument = (type: CustomerType, document: string) =>
  type === CustomerType.INDIVIDUAL ? isValidCpf(document) : isValidCnpj(document);
