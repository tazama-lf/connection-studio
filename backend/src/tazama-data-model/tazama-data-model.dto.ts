export interface CreateDestinationTypeDto {
  collection_type: string;
  name: string;
  description?: string;
  destination_id: number;
}

export interface CreateFieldDto {
  name: string;
  field_type: string;
  parent_id?: number;
  is_active?: boolean;
  serial_no?: number;
}

export interface DestinationTypeResponse {
  destination_type_id: number;
  collection_type: string;
  name: string;
  description?: string;
  destination_id: number;
  created_at: Date;
}

export interface FieldResponse {
  field_id: number;
  name: string;
  field_type: string;
  parent_id?: number;
  is_active: boolean;
  serial_no?: number;
  collection_id: number;
}