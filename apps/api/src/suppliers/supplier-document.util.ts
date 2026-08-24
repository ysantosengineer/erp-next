import { SupplierType } from '@prisma/client';
import { isValidCnpj, isValidCpf } from '../common/utils/br-document.util';

export { digitsOnly, isValidCnpj, isValidCpf } from '../common/utils/br-document.util';

export const isValidSupplierDocument = (type: SupplierType, document: string) =>
  type === SupplierType.INDIVIDUAL ? isValidCpf(document) : isValidCnpj(document);
