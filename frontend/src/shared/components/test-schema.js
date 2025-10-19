import { convertInferredFieldsToJsonSchema } from './PayloadEditor';

// Test payload with deeply nested arrays
const testPayload = {
  teams: [
    {
      name: "Engineering",
      projects: [
        {
          title: "API Gateway",
          modules: [
            {
              name: "Auth Module",
              tasks: [
                {
                  description: "Implement JWT validation",
                  assignees: [
                    { name: "Alice", role: "Developer" },
                    { name: "Bob", role: "Reviewer" }
                  ]
                },
                {
                  description: "Add rate limiting",
                  assignees: [
                    { name: "Charlie", role: "Developer" }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

// Mock inferred fields that would be generated from the payload
const mockInferredFields = [
  { path: 'teams', type: 'Array', required: true, level: 0 },
  { path: 'teams.name', type: 'String', required: true, level: 1 },
  { path: 'teams.projects', type: 'Array', required: true, level: 1 },
  { path: 'teams.projects.title', type: 'String', required: true, level: 2 },
  { path: 'teams.projects.modules', type: 'Array', required: true, level: 2 },
  { path: 'teams.projects.modules.name', type: 'String', required: true, level: 3 },
  { path: 'teams.projects.modules.tasks', type: 'Array', required: true, level: 3 },
  { path: 'teams.projects.modules.tasks.description', type: 'String', required: true, level: 4 },
  { path: 'teams.projects.modules.tasks.assignees', type: 'Array', required: true, level: 4 },
  { path: 'teams.projects.modules.tasks.assignees.name', type: 'String', required: true, level: 5 },
  { path: 'teams.projects.modules.tasks.assignees.role', type: 'String', required: true, level: 5 }
];

console.log('Testing nested array schema generation...');
console.log('Input fields:', mockInferredFields);

try {
  const schema = convertInferredFieldsToJsonSchema(mockInferredFields);
  console.log('✅ Generated schema:', JSON.stringify(schema, null, 2));

  // Validate the schema structure
  const teamsItems = schema.properties.teams.items;
  const projectsItems = teamsItems.properties.projects.items;
  const modulesItems = projectsItems.properties.modules.items;
  const tasksItems = modulesItems.properties.tasks.items;
  const assigneesItems = tasksItems.properties.assignees.items;

  console.log('✅ Schema validation:');
  console.log('- teams.items exists:', !!teamsItems);
  console.log('- teams.items.properties exists:', !!teamsItems.properties);
  console.log('- projects.items.properties exists:', !!projectsItems.properties);
  console.log('- modules.items.properties exists:', !!modulesItems.properties);
  console.log('- tasks.items.properties exists:', !!tasksItems.properties);
  console.log('- assignees.items.properties exists:', !!assigneesItems.properties);
  console.log('- assignees.items has name and role:', assigneesItems.properties.name && assigneesItems.properties.role);

} catch (error) {
  console.error('❌ Error generating schema:', error);
}