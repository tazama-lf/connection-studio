import { convertInferredFieldsToJsonSchema } from '../utils/schemaUtils';
import type { InferredField } from '../utils/schemaUtils';

describe('convertInferredFieldsToJsonSchema', () => {
  it('should handle deeply nested arrays correctly', () => {
    // Mock inferred fields that would be generated from a complex nested array payload
    const mockInferredFields: InferredField[] = [
      { path: 'teams', type: 'Array', required: true, level: 0 },
      { path: 'teams.name', type: 'String', required: true, level: 1 },
      { path: 'teams.projects', type: 'Array', required: true, level: 1 },
      {
        path: 'teams.projects.title',
        type: 'String',
        required: true,
        level: 2,
      },
      {
        path: 'teams.projects.modules',
        type: 'Array',
        required: true,
        level: 2,
      },
      {
        path: 'teams.projects.modules.name',
        type: 'String',
        required: true,
        level: 3,
      },
      {
        path: 'teams.projects.modules.tasks',
        type: 'Array',
        required: true,
        level: 3,
      },
      {
        path: 'teams.projects.modules.tasks.description',
        type: 'String',
        required: true,
        level: 4,
      },
      {
        path: 'teams.projects.modules.tasks.assignees',
        type: 'Array',
        required: true,
        level: 4,
      },
      {
        path: 'teams.projects.modules.tasks.assignees.name',
        type: 'String',
        required: true,
        level: 5,
      },
      {
        path: 'teams.projects.modules.tasks.assignees.role',
        type: 'String',
        required: true,
        level: 5,
      },
    ];

    const schema = convertInferredFieldsToJsonSchema(mockInferredFields);

    // Validate the schema structure
    expect(schema).toBeDefined();
    expect(schema.type).toBe('object');
    expect(schema.properties).toBeDefined();
    expect(schema.properties.teams).toBeDefined();
    expect(schema.properties.teams.type).toBe('array');

    // Check teams array items
    const teamsItems = schema.properties.teams.items;
    expect(teamsItems).toBeDefined();
    expect(teamsItems.type).toBe('object');
    expect(teamsItems.properties).toBeDefined();
    expect(teamsItems.properties.name).toBeDefined();
    expect(teamsItems.properties.name.type).toBe('string');
    expect(teamsItems.properties.projects).toBeDefined();
    expect(teamsItems.properties.projects.type).toBe('array');

    // Check projects array items
    const projectsItems = teamsItems.properties.projects.items;
    expect(projectsItems).toBeDefined();
    expect(projectsItems.type).toBe('object');
    expect(projectsItems.properties).toBeDefined();
    expect(projectsItems.properties.title).toBeDefined();
    expect(projectsItems.properties.title.type).toBe('string');
    expect(projectsItems.properties.modules).toBeDefined();
    expect(projectsItems.properties.modules.type).toBe('array');

    // Check modules array items
    const modulesItems = projectsItems.properties.modules.items;
    expect(modulesItems).toBeDefined();
    expect(modulesItems.type).toBe('object');
    expect(modulesItems.properties).toBeDefined();
    expect(modulesItems.properties.name).toBeDefined();
    expect(modulesItems.properties.name.type).toBe('string');
    expect(modulesItems.properties.tasks).toBeDefined();
    expect(modulesItems.properties.tasks.type).toBe('array');

    // Check tasks array items
    const tasksItems = modulesItems.properties.tasks.items;
    expect(tasksItems).toBeDefined();
    expect(tasksItems.type).toBe('object');
    expect(tasksItems.properties).toBeDefined();
    expect(tasksItems.properties.description).toBeDefined();
    expect(tasksItems.properties.description.type).toBe('string');
    expect(tasksItems.properties.assignees).toBeDefined();
    expect(tasksItems.properties.assignees.type).toBe('array');

    // Check assignees array items (deepest nesting)
    const assigneesItems = tasksItems.properties.assignees.items;
    expect(assigneesItems).toBeDefined();
    expect(assigneesItems.type).toBe('object');
    expect(assigneesItems.properties).toBeDefined();
    expect(assigneesItems.properties.name).toBeDefined();
    expect(assigneesItems.properties.name.type).toBe('string');
    expect(assigneesItems.properties.role).toBeDefined();
    expect(assigneesItems.properties.role.type).toBe('string');
  });

  it('should handle simple arrays correctly', () => {
    const mockInferredFields: InferredField[] = [
      { path: 'tags', type: 'Array', required: false, level: 0 },
    ];

    const schema = convertInferredFieldsToJsonSchema(mockInferredFields);

    expect(schema).toBeDefined();
    expect(schema.properties.tags).toBeDefined();
    expect(schema.properties.tags.type).toBe('array');
    expect(schema.properties.tags.items).toBeDefined();
    expect(schema.properties.tags.items.type).toBe('string'); // Default for arrays without nested fields
  });

  it('should handle mixed object and array structures', () => {
    const mockInferredFields: InferredField[] = [
      { path: 'user', type: 'Object', required: true, level: 0 },
      { path: 'user.name', type: 'String', required: true, level: 1 },
      { path: 'user.roles', type: 'Array', required: false, level: 1 },
      { path: 'user.roles.name', type: 'String', required: true, level: 2 },
      {
        path: 'user.roles.permissions',
        type: 'Array',
        required: false,
        level: 2,
      },
    ];

    const schema = convertInferredFieldsToJsonSchema(mockInferredFields);

    expect(schema).toBeDefined();
    expect(schema.properties.user).toBeDefined();
    expect(schema.properties.user.type).toBe('object');

    const userProps = schema.properties.user.properties;
    expect(userProps.name).toBeDefined();
    expect(userProps.name.type).toBe('string');
    expect(userProps.roles).toBeDefined();
    expect(userProps.roles.type).toBe('array');

    const rolesItems = userProps.roles.items;
    expect(rolesItems).toBeDefined();
    expect(rolesItems.type).toBe('object');
    expect(rolesItems.properties.name).toBeDefined();
    expect(rolesItems.properties.name.type).toBe('string');
    expect(rolesItems.properties.permissions).toBeDefined();
    expect(rolesItems.properties.permissions.type).toBe('array');
    expect(rolesItems.properties.permissions.items.type).toBe('string'); // Default for arrays without nested fields
  });
});
