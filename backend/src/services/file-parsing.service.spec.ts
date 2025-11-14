import { Test, TestingModule } from '@nestjs/testing';
import { FileParsingService } from './file-parsing.service';
import { ContentType } from '@tazama-lf/tcs-lib';
import * as tcsLib from '@tazama-lf/tcs-lib';

// Mock the tcs-lib functions
jest.mock('@tazama-lf/tcs-lib', () => ({
  ...jest.requireActual('@tazama-lf/tcs-lib'),
  parseUploadedFile: jest.fn(),
  validateFileType: jest.fn(),
  detectContentType: jest.fn(),
  getAllowedMimeTypes: jest.fn(),
}));

const {
  parseUploadedFile,
  validateFileType,
  detectContentType,
  getAllowedMimeTypes,
} = tcsLib;

describe('FileParsingService', () => {
  let service: FileParsingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileParsingService],
    }).compile();

    service = module.get<FileParsingService>(FileParsingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseUploadedFile', () => {
    it('should call parseUploadedFile from tcs-lib with correct parameters', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('{"test": "data"}'),
        size: 100,
      } as Express.Multer.File;

      const expectedContentType = ContentType.JSON;
      const mockResult = {
        content: '{"test": "data"}',
        contentType: ContentType.JSON,
        isValid: true,
      };

      (parseUploadedFile as jest.Mock).mockReturnValue(mockResult);

      const result = service.parseUploadedFile(mockFile, expectedContentType);

      expect(parseUploadedFile).toHaveBeenCalledWith(
        mockFile,
        expectedContentType,
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle XML file parsing', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'config.xml',
        encoding: '7bit',
        mimetype: 'application/xml',
        buffer: Buffer.from('<root><data>test</data></root>'),
        size: 75,
      } as Express.Multer.File;

      const mockResult = {
        content: '<root><data>test</data></root>',
        contentType: ContentType.XML,
        isValid: true,
      };

      (parseUploadedFile as jest.Mock).mockReturnValue(mockResult);

      const result = service.parseUploadedFile(mockFile, ContentType.XML);

      expect(parseUploadedFile).toHaveBeenCalledWith(mockFile, ContentType.XML);
      expect(result).toEqual(mockResult);
    });
  });

  describe('validateFileType', () => {
    it('should call validateFileType from tcs-lib with correct parameters', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('{"test": "data"}'),
        size: 100,
      } as Express.Multer.File;

      const content = '{"test": "data"}';
      const expectedContentType = ContentType.JSON;
      const mockValidation = { isValid: true };

      (validateFileType as jest.Mock).mockReturnValue(mockValidation);

      const result = service.validateFileType(
        mockFile,
        expectedContentType,
        content,
      );

      expect(validateFileType).toHaveBeenCalledWith(
        mockFile,
        expectedContentType,
        content,
      );
      expect(result).toEqual(mockValidation);
    });

    it('should return validation error for invalid JSON', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'invalid.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('not valid json'),
        size: 50,
      } as Express.Multer.File;

      const content = 'not valid json';
      const mockValidation = {
        isValid: false,
        error: 'Invalid JSON format',
      };

      (validateFileType as jest.Mock).mockReturnValue(mockValidation);

      const result = service.validateFileType(
        mockFile,
        ContentType.JSON,
        content,
      );

      expect(validateFileType).toHaveBeenCalledWith(
        mockFile,
        ContentType.JSON,
        content,
      );
      expect(result).toEqual(mockValidation);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid JSON format');
    });

    it('should validate XML file type', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'data.xml',
        encoding: '7bit',
        mimetype: 'application/xml',
        buffer: Buffer.from('<root/>'),
        size: 30,
      } as Express.Multer.File;

      const content = '<root/>';
      const mockValidation = { isValid: true };

      (validateFileType as jest.Mock).mockReturnValue(mockValidation);

      const result = service.validateFileType(
        mockFile,
        ContentType.XML,
        content,
      );

      expect(validateFileType).toHaveBeenCalledWith(
        mockFile,
        ContentType.XML,
        content,
      );
      expect(result.isValid).toBe(true);
    });

    it('should return error for mismatched file type', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('<xml></xml>'),
        size: 50,
      } as Express.Multer.File;

      const content = '<xml></xml>';
      const mockValidation = {
        isValid: false,
        error: 'File type mismatch: expected application/json',
      };

      (validateFileType as jest.Mock).mockReturnValue(mockValidation);

      const result = service.validateFileType(
        mockFile,
        ContentType.JSON,
        content,
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('File type mismatch');
    });
  });

  describe('detectContentType', () => {
    it('should call detectContentType from tcs-lib with correct file', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'test.json',
        encoding: '7bit',
        mimetype: 'application/json',
        buffer: Buffer.from('{"test": "data"}'),
        size: 100,
      } as Express.Multer.File;

      (detectContentType as jest.Mock).mockReturnValue(ContentType.JSON);

      const result = service.detectContentType(mockFile);

      expect(detectContentType).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(ContentType.JSON);
    });

    it('should detect XML content type', () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'config.xml',
        encoding: '7bit',
        mimetype: 'application/xml',
        buffer: Buffer.from('<root></root>'),
        size: 40,
      } as Express.Multer.File;

      (detectContentType as jest.Mock).mockReturnValue(ContentType.XML);

      const result = service.detectContentType(mockFile);

      expect(detectContentType).toHaveBeenCalledWith(mockFile);
      expect(result).toBe(ContentType.XML);
    });
  });

  describe('getAllowedMimeTypes', () => {
    it('should call getAllowedMimeTypes from tcs-lib and return the result', () => {
      const mockMimeTypes = [
        'application/json',
        'text/csv',
        'application/xml',
        'text/plain',
      ];

      (getAllowedMimeTypes as jest.Mock).mockReturnValue(mockMimeTypes);

      const result = service.getAllowedMimeTypes();

      expect(getAllowedMimeTypes).toHaveBeenCalled();
      expect(result).toEqual(mockMimeTypes);
      expect(result).toHaveLength(4);
    });

    it('should return array of allowed mime types', () => {
      const mockMimeTypes = ['application/json', 'text/csv', 'application/xml'];

      (getAllowedMimeTypes as jest.Mock).mockReturnValue(mockMimeTypes);

      const result = service.getAllowedMimeTypes();

      expect(result).toContain('application/json');
      expect(result).toContain('text/csv');
      expect(result).toContain('application/xml');
    });

    it('should handle empty mime types list', () => {
      (getAllowedMimeTypes as jest.Mock).mockReturnValue([]);

      const result = service.getAllowedMimeTypes();

      expect(getAllowedMimeTypes).toHaveBeenCalled();
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
