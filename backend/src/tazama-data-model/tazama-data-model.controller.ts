import { Controller, Get, Param } from '@nestjs/common';
import { TazamaDataModelService } from './tazama-data-model.service';
import { TazamaCollectionName } from './tazama-data-model.interfaces';

@Controller('tazama-data-model')
export class TazamaDataModelController {
  constructor(
    private readonly tazamaDataModelService: TazamaDataModelService,
  ) {}

  @Get('destination-paths')
  getAllDestinationPaths() {
    return {
      success: true,
      data: this.tazamaDataModelService.getAllDestinationPaths(),
    };
  }

  @Get('destination-paths/grouped')
  getDestinationPathsByCollection() {
    return {
      success: true,
      data: this.tazamaDataModelService.getDestinationPathsByCollection(),
    };
  }

  @Get('destination-options')
  getDestinationOptions() {
    return {
      success: true,
      data: this.tazamaDataModelService.getDestinationOptions(),
    };
  }

  @Get('collections')
  getAllCollectionSchemas() {
    return {
      success: true,
      data: this.tazamaDataModelService.getAllCollectionSchemas(),
    };
  }

  @Get('collections/:collectionName')
  getCollectionSchema(@Param('collectionName') collectionName: string) {
    const schema = this.tazamaDataModelService.getCollectionSchema(
      collectionName as TazamaCollectionName,
    );
    if (!schema) {
      return {
        success: false,
        message: `Collection '${collectionName}' not found`,
      };
    }
    return {
      success: true,
      data: schema,
    };
  }

  @Get('validate/:path')
  validateDestinationPath(@Param('path') path: string) {
    const isValid = this.tazamaDataModelService.isValidDestinationPath(path);
    return {
      success: true,
      valid: isValid,
      path,
    };
  }

  @Get('field-info/:path')
  getFieldInfo(@Param('path') path: string) {
    const fieldType = this.tazamaDataModelService.getFieldType(path);
    const required = this.tazamaDataModelService.isFieldRequired(path);
    const description = this.tazamaDataModelService.getFieldDescription(path);
    const example = this.tazamaDataModelService.getFieldExample(path);

    if (!fieldType) {
      return {
        success: false,
        message: `Field '${path}' not found`,
      };
    }

    return {
      success: true,
      data: {
        path,
        type: fieldType,
        required,
        description,
        example,
      },
    };
  }

  @Get('collections/:collectionName/required-fields')
  getRequiredFields(@Param('collectionName') collectionName: string) {
    const fields = this.tazamaDataModelService.getRequiredFields(
      collectionName as TazamaCollectionName,
    );
    return {
      success: true,
      collection: collectionName,
      requiredFields: fields,
    };
  }
}
