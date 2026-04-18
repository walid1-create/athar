import { PartialType } from '@nestjs/swagger';
import { CreateMerchantTypeDto } from './create-merchant-type.dto';

export class UpdateMerchantTypeDto extends PartialType(CreateMerchantTypeDto) {}
