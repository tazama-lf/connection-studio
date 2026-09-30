import * as _ from 'lodash';
import type { SimulationError } from '../simulation/dto/simulation.dto';

const RUNTIME_CONTEXT_FIELDS = ['tenantId', 'tenant_id', 'userId', 'user_id'];

export function getFieldValue(obj: unknown, path: string): unknown {
  if (!path) return undefined;

  const normalizedPath = path.replace(/\[(\d+)\]/g, '.$1');

  return _.get(obj, normalizedPath);
}

function isConstantMapping(mapping: Record<string, unknown>): boolean {
  return (
    mapping.transformation === 'CONSTANT' || mapping.constantValue !== undefined
  );
}

export function validateMappings(
  payload: Record<string, unknown>,
  mappings: unknown[],
): SimulationError[] {
  const errors: SimulationError[] = [];

  for (let i = 0; i < mappings.length; i += 1) {
    const mapping = mappings[i] as Record<string, unknown>;
    let sources: string[] = [];
    const { sources: mappingSources, source } = mapping;
    if (mappingSources && Array.isArray(mappingSources)) {
      sources = mappingSources;
    } else if (source) {
      sources = Array.isArray(source) ? source : [source as string];
    }
    if (isConstantMapping(mapping)) {
      continue;
    }

    let anySourceExists = false;
    const missingSources: string[] = [];
    const allSourcesAreRuntimeContext = sources.every((src: string) =>
      RUNTIME_CONTEXT_FIELDS.includes(src),
    );

    for (const src of sources) {
      if (RUNTIME_CONTEXT_FIELDS.includes(src)) {
        anySourceExists = true;
        break;
      }

      const fieldValue = getFieldValue(payload, src);

      if (fieldValue !== undefined && fieldValue !== null) {
        anySourceExists = true;
        break;
      } else {
        missingSources.push(src);
      }
    }
    if (
      !anySourceExists &&
      sources.length > 0 &&
      !allSourcesAreRuntimeContext
    ) {
      const nonRuntimeMissing = missingSources.filter(
        (src) => !RUNTIME_CONTEXT_FIELDS.includes(src),
      );

      if (nonRuntimeMissing.length > 0) {
        errors.push({
          field: 'mapping',
          message: `Mapping #${i + 1}: None of the source fields exist in payload: ${nonRuntimeMissing.join(', ')}`,
          path: `mappings[${i}]`,
          value: mapping,
        });
      }
    }
    if (!mapping.destination) {
      errors.push({
        field: 'mapping',
        message: `Mapping #${i + 1}: Missing destination field`,
        path: `mappings[${i}]`,
      });
    }
  }

  return errors;
}

export function validateMappingDestinations(
  dataModel: Record<string, unknown>,
  mappings: unknown[],
): SimulationError[] {
  const errors: SimulationError[] = [];

  for (let i = 0; i < mappings.length; i += 1) {
    const mapping = mappings[i] as Record<string, unknown>;
    if (isConstantMapping(mapping)) {
      continue;
    }

    const { destination } = mapping;
    const destinations = Array.isArray(destination)
      ? destination
      : destination
        ? [destination as string]
        : [];

    if (destinations.length === 0) {
      errors.push({
        field: 'mapping',
        message: `Mapping #${i + 1}: Missing destination field`,
        path: `mappings[${i}]`,
      });
      continue;
    }

    const missingDestinations = destinations.filter((dest) => {
      const fieldValue = getFieldValue(dataModel, dest);
      return fieldValue === undefined || fieldValue === null;
    });

    if (missingDestinations.length > 0) {
      errors.push({
        field: 'mapping',
        message: `Mapping #${i + 1}: Destination field(s) do not exist in data model: ${missingDestinations.join(', ')}`,
        path: `mappings[${i}]`,
        value: mapping,
      });
    }
  }

  return errors;
}
