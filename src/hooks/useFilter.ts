import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

export interface FilterState {
  search: string;
  status: string;
  priority?: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  page: string;
  tags?: string[];
  author?: string;
}

export interface FilterOptions {
  baseKey?: string;
  defaultSort?: string;
  debounceMs?: number;
  persistKey?: string;
}

export interface QuickFilter {
  label: string;
  value: string;
  dateFrom?: string;
  dateTo?: string;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function getMonthStart(): string {
  return new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
}

export const DEFAULT_QUICK_FILTERS: QuickFilter[] = [
  { label: 'HOY', value: 'today', dateFrom: getToday(), dateTo: getToday() },
  { label: 'ESTA SEMANA', value: 'week', dateFrom: getWeekStart(), dateTo: getToday() },
  { label: 'ESTE MES', value: 'month', dateFrom: getMonthStart(), dateTo: getToday() },
];

export function useFilter(options: FilterOptions = {}) {
  const { baseKey = 'filter', defaultSort = 'fecha_desc', debounceMs = 300, persistKey } = options;

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getInitialState = (): FilterState => ({
    search: searchParams.get('q') || '',
    status: searchParams.get('status') || 'todos',
    priority: searchParams.get('priority') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    sortBy: searchParams.get('sort') || defaultSort,
    page: searchParams.get('page') || '1',
    tags: searchParams.get('tags') ? searchParams.get('tags')!.split(',') : [],
    author: searchParams.get('author') || '',
  });

  const [state, setState] = useState<FilterState>(getInitialState);

  const syncToUrl = useCallback(
    (newState: Partial<FilterState>, replace = false) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(newState).forEach(([key, value]) => {
        const paramKey =
          key === 'search'
            ? 'q'
            : key === 'dateFrom'
              ? 'from'
              : key === 'dateTo'
                ? 'to'
                : key === 'sortBy'
                  ? 'sort'
                  : key;
        if (!value || (Array.isArray(value) && value.length === 0)) {
          params.delete(paramKey);
        } else {
          params.set(paramKey, String(value));
        }
      });

      const newUrl = `${location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
      navigate(newUrl, { replace });
    },
    [searchParams, location.pathname, navigate],
  );

  const setSearchDebounced = useCallback(
    (value: string) => {
      setState((prev) => ({ ...prev, search: value }));

      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        syncToUrl({ search: value }, true);
      }, debounceMs);
    },
    [syncToUrl, debounceMs],
  );

  const setFilter = useCallback(
    (key: keyof FilterState, value: string | string[] | undefined) => {
      setState((prev) => ({ ...prev, [key]: value }));
      syncToUrl({ [key]: value }, true);
    },
    [syncToUrl],
  );

  const clearFilters = useCallback(() => {
    const empty: FilterState = {
      search: '',
      status: 'todos',
      priority: '',
      dateFrom: '',
      dateTo: '',
      sortBy: defaultSort,
      page: '1',
      tags: [],
      author: '',
    };
    setState(empty);
    navigate(location.pathname, { replace: true });
  }, [defaultSort, location.pathname, navigate]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (state.search) count++;
    if (state.status && state.status !== 'todos') count++;
    if (state.priority) count++;
    if (state.dateFrom) count++;
    if (state.dateTo) count++;
    if (state.tags && state.tags.length > 0) count++;
    if (state.author) count++;
    return count;
  }, [state]);

  const hasFilters = useMemo(() => activeFilterCount > 0, [activeFilterCount]);

  useEffect(() => {
    if (persistKey) {
      localStorage.setItem(`${persistKey}_filter`, JSON.stringify(state));
    }
  }, [state, persistKey]);

  useEffect(() => {
    if (persistKey && !searchParams.toString()) {
      const saved = localStorage.getItem(`${persistKey}_filter`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setState(parsed);
          syncToUrl(parsed, true);
        } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    setState(getInitialState());
  }, [searchParams]);

  return {
    search: state.search,
    status: state.status,
    priority: state.priority,
    dateFrom: state.dateFrom,
    dateTo: state.dateTo,
    sortBy: state.sortBy,
    page: state.page,
    tags: state.tags,
    author: state.author,

    setSearch: setSearchDebounced,
    setStatus: (value: string) => setFilter('status', value),
    setPriority: (value: string) => setFilter('priority', value),
    setDateFrom: (value: string) => setFilter('dateFrom', value),
    setDateTo: (value: string) => setFilter('dateTo', value),
    setSortBy: (value: string) => setFilter('sortBy', value),
    setPage: (value: string) => setFilter('page', value),
    setTags: (value: string[]) => setFilter('tags', value),
    setAuthor: (value: string) => setFilter('author', value),
    setFilter,
    clearFilters,

    hasFilters,
    activeFilterCount,
    syncToUrl,

    rawState: state,
  };
}

export function filterData<T>(
  data: T[],
  state: FilterState,
  options: {
    searchFields: string[];
    dateField?: string;
    statusField?: string;
    priorityField?: string;
    authorField?: string;
    tagsField?: string;
  },
): T[] {
  const {
    searchFields,
    dateField = 'createdAt',
    statusField = 'status',
    priorityField = 'priority',
    authorField = 'authorId',
    tagsField = 'tags',
  } = options;

  return data.filter((item: any) => {
    if (state.search) {
      const term = state.search.toLowerCase();
      const matchesSearch = searchFields.some((field) => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      });
      if (!matchesSearch) return false;
    }

    if (state.status && state.status !== 'todos') {
      if (item[statusField] !== state.status) return false;
    }

    if (state.priority) {
      if (item[priorityField] !== state.priority) return false;
    }

    if (state.dateFrom || state.dateTo) {
      const itemDate = new Date(item[dateField]);
      if (state.dateFrom && itemDate < new Date(state.dateFrom)) return false;
      if (state.dateTo && itemDate > new Date(state.dateTo + 'T23:59:59')) return false;
    }

    if (state.author) {
      if (item[authorField] !== state.author) return false;
    }

    if (state.tags && state.tags.length > 0) {
      const itemTags = item[tagsField] || [];
      const hasTag = state.tags.some((tag) => itemTags.includes(tag));
      if (!hasTag) return false;
    }

    return true;
  });
}

export function usePagination<T>(data: T[], perPage = 10, page = '1') {
  const currentPage = parseInt(page, 10);
  const totalPages = Math.ceil(data.length / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const paginatedData = data.slice(start, end);

  return {
    data: paginatedData,
    total: data.length,
    totalPages,
    currentPage,
    perPage,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
    start: start + 1,
    end: Math.min(end, data.length),
  };
}
