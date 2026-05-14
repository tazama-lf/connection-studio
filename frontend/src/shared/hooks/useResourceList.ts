import { useState, useEffect, useMemo, useCallback } from 'react';
import { useToast } from '@shared/providers/ToastProvider';
import { UI_CONFIG } from '@shared/config/app.config';
import { useAuth } from '@features/auth/contexts/AuthContext';
import {
  isEditor,
  isExporter,
  isApprover,
  isPublisher,
  getPrimaryRole,
} from '@utils/common/roleUtils';

/**
 * Generic pagination state
 */
export interface PaginationState {
  page: number;
  totalPages: number;
  totalRecords: number;
}

/**
 * Generic loading state for actions
 */
export interface LoadingState<TAction extends string = string> {
  page: boolean;
  action: TAction | '';
}

/**
 * Generic confirmation dialog state
 */
export interface ConfirmDialogState<
  TResource,
  TAction extends string = string,
> {
  open: boolean;
  type: TAction | '';
  resource: TResource | null;
}

/**
 * Role-based permissions
 */
export interface RolePermissions {
  userIsEditor: boolean;
  userIsExporter: boolean;
  userIsApprover: boolean;
  userIsPublisher: boolean;
  userRole: string | null;
}

/**
 * API handlers for resource operations
 */
export interface ResourceApiHandlers<TResource> {
  /**
   * Load paginated resources
   */
  load: (
    page: number,
    itemsPerPage: number,
    userRole: string,
    filters: Record<string, unknown>,
  ) => Promise<{
    data?: TResource[];
    jobs?: TResource[];
    items?: TResource[];
    pages: number;
    total: number;
  }>;
  /**
   * Get single resource by ID
   */
  getById?: (id: string, type?: string) => Promise<TResource>;
  /**
   * Update resource status
   */
  updateStatus?: (
    id: string,
    status: string,
    type?: string,
    reason?: string,
  ) => Promise<void>;
}

/**
 * Configuration options for useResourceList hook
 */
export interface UseResourceListOptions<
  TResource,
  TAction extends string = string,
> {
  /**
   * API handlers for resource operations
   */
  apiHandlers: ResourceApiHandlers<TResource>;
  /**
   * Success messages for different actions
   */
  successMessages?: Partial<Record<TAction | 'updated' | 'deleted', string>>;
  /**
   * Error messages for different actions
   */
  errorMessages?: Partial<
    Record<TAction | 'updated' | 'deleted' | 'load', string>
  >;
  /**
   * Optional initial filters
   */
  initialFilters?: Record<string, unknown>;
  /**
   * Optional items per page override
   */
  itemsPerPage?: number;
}

/**
 * Return type for useResourceList hook
 */
export interface UseResourceListReturn<
  TResource,
  TAction extends string = string,
> {
  /** List of resources */
  resources: TResource[];
  /** Pagination state */
  pagination: PaginationState;
  /** Current search/filter parameters */
  searchingFilters: Record<string, unknown>;
  /** Currently selected resource */
  selectedResource: TResource | null;
  /** Edit mode flag */
  editMode: boolean;
  /** Confirmation dialog state */
  confirmDialog: ConfirmDialogState<TResource, TAction>;
  /** Error state */
  error: string | null;
  /** Page loading state */
  loading: boolean;
  /** Action loading state */
  actionLoading: TAction | '';
  /** Items per page */
  itemsPerPage: number;
  /** Role-based permissions */
  permissions: RolePermissions;
  /** Set current page */
  setPage: (page: number) => void;
  /** Update search filters */
  setSearchingFilters: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
  /** Set selected resource */
  setSelectedResource: React.Dispatch<React.SetStateAction<TResource | null>>;
  /** Set edit mode */
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
  /** Set confirmation dialog */
  setConfirmDialog: React.Dispatch<
    React.SetStateAction<ConfirmDialogState<TResource, TAction>>
  >;
  /** Reload resources */
  loadResources: (pageNumber?: number) => Promise<void>;
  /** View resource details */
  handleView: (resourceId: string, type?: string) => Promise<void>;
  /** Edit resource */
  handleEdit: (resource: TResource) => Promise<void>;
}

/**
 * useResourceList - Generic hook for resource list management
 *
 * Consolidates common patterns for managing lists of resources with:
 * - Pagination
 * - Role-based permissions
 * - Loading states
 * - Error handling
 * - CRUD operations
 *
 * @example
 * ```tsx
 * const {
 *   resources: jobs,
 *   loading,
 *   pagination,
 *   handleView,
 *   handleEdit,
 * } = useResourceList<DataEnrichmentJobResponse, 'approve' | 'reject' | 'export'>({
 *   apiHandlers: {
 *     load: dataEnrichmentHandlers.loadJobs,
 *     getById: dataEnrichmentHandlers.dataEnrichmentJobApi.getById,
 *   },
 *   successMessages: {
 *     approve: 'Job approved successfully',
 *     reject: 'Job rejected successfully',
 *   },
 * });
 * ```
 */
export function useResourceList<
  TResource extends { id: string; status?: string; type?: string },
  TAction extends string = string,
>(
  options: UseResourceListOptions<TResource, TAction>,
): UseResourceListReturn<TResource, TAction> {
  const {
    apiHandlers,
    initialFilters = {},
    itemsPerPage: customItemsPerPage,
  } = options;

  const errorMessages: Partial<
    Record<TAction | 'updated' | 'deleted' | 'load', string>
  > = options.errorMessages ?? {};

  const [resources, setResources] = useState<TResource[]>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    totalPages: 0,
    totalRecords: 0,
  });
  const [searchingFilters, setSearchingFilters] =
    useState<Record<string, unknown>>(initialFilters);
  const [error, setError] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState<TAction>>({
    page: true,
    action: '',
  });
  const [selectedResource, setSelectedResource] = useState<TResource | null>(
    null,
  );
  const [editMode, setEditMode] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<
    ConfirmDialogState<TResource, TAction>
  >({
    open: false,
    type: '',
    resource: null,
  });

  const { showError } = useToast();
  const { user } = useAuth();

  const itemsPerPage =
    customItemsPerPage ?? UI_CONFIG.pagination.defaultPageSize;

  /**
   * Memoized role-based permissions
   */
  const permissions: RolePermissions = useMemo(() => {
    const claims = user?.claims ?? [];
    return {
      userIsEditor: isEditor(claims),
      userIsExporter: isExporter(claims),
      userIsApprover: isApprover(claims),
      userIsPublisher: isPublisher(claims),
      userRole: getPrimaryRole(claims),
    };
  }, [user]);

  function getErrorMessage(
    err: unknown,
    fallback = 'An error occurred',
  ): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return fallback;
  }

  /**
   * Load resources with pagination and filters
   */
  const loadResources = useCallback(
    async (pageNumber = pagination.page) => {
      try {
        setLoadingState((s) => ({ ...s, page: true }));
        setError(null);

        const response = await apiHandlers.load(
          pageNumber,
          itemsPerPage,
          permissions.userRole ?? '',
          searchingFilters,
        );

        // Handle different response structures
        const resourceData =
          response.data ?? response.jobs ?? response.items ?? [];

        setResources(resourceData);
        setPagination({
          page: pageNumber,
          totalPages: response.pages,
          totalRecords: response.total,
        });
      } catch (err) {
        const message = getErrorMessage(
          err,
          errorMessages.load ?? 'Failed to load resources',
        );
        setError(message);
      } finally {
        setLoadingState((s) => ({ ...s, page: false }));
      }
    },
    [
      apiHandlers,
      itemsPerPage,
      permissions.userRole,
      searchingFilters,
      pagination.page,
      errorMessages.load,
    ],
  );

  /**
   * Load resources when dependencies change
   */
  useEffect(() => {
    loadResources();
  }, [loadResources]);

  /**
   * View resource details
   */
  const handleView = useCallback(
    async (resourceId: string, type?: string) => {
      if (!apiHandlers.getById) {
        return;
      }

      try {
        setLoadingState((s) => ({ ...s, page: true }));
        const resourceDetails = await apiHandlers.getById(resourceId, type);
        setSelectedResource(resourceDetails);
        setEditMode(false);
      } catch (err) {
        showError('Failed to load resource details');
      } finally {
        setLoadingState((s) => ({ ...s, page: false }));
      }
    },
    [apiHandlers, showError],
  );

  /**
   * Edit resource
   */
  const handleEdit = useCallback(
    async (resource: TResource) => {
      if (!apiHandlers.getById) {
        setSelectedResource(resource);
        setEditMode(true);
        return;
      }

      try {
        setLoadingState((s) => ({ ...s, page: true }));
        const resourceType = resource.type?.toUpperCase();
        const resourceDetails = await apiHandlers.getById(
          resource.id,
          resourceType,
        );
        setSelectedResource(resourceDetails);
        setEditMode(true);
      } catch (err) {
        showError('Failed to load resource details for edit');
      } finally {
        setLoadingState((s) => ({ ...s, page: false }));
      }
    },
    [apiHandlers, showError],
  );

  /**
   * Set current page
   */
  const setPage = useCallback((newPage: number) => {
    setPagination((p) => ({ ...p, page: newPage }));
  }, []);

  return {
    resources,
    pagination,
    searchingFilters,
    selectedResource,
    editMode,
    confirmDialog,
    error,
    loading: loadingState.page,
    actionLoading: loadingState.action,
    itemsPerPage,
    permissions,
    setPage,
    setSearchingFilters,
    setSelectedResource,
    setEditMode,
    setConfirmDialog,
    loadResources,
    handleView,
    handleEdit,
  };
}
