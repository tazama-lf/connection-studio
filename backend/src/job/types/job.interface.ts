interface EndpointJobRecord {
    id: string;
    endpoint_name: string;
    path: string | null;
    mode: string;
    table_name: string;
    description: string | null;
    version: string;
    status: string;
    publishing_status: string;
    created_at: Date;
    type: 'push' | 'pull';
}

export { type EndpointJobRecord }