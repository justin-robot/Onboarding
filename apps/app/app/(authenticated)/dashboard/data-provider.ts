"use client";

import type { DataProvider } from "ra-core";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Resource endpoint mapping
const resourceEndpoints: Record<string, {
  list: string;
  getOne?: string;
  create?: string;
  update?: string;
  delete?: string;
}> = {
  users: {
    list: "/api/auth/admin/list-users",
    create: "/api/auth/admin/create-user",
    update: "/api/auth/admin/update-user",
    delete: "/api/auth/admin/delete-user",
  },
  workspaces: {
    list: "/api/admin/workspaces",
    getOne: "/api/admin/workspaces",
    update: "/api/admin/workspaces",
    delete: "/api/admin/workspaces",
  },
  tasks: {
    list: "/api/admin/tasks",
    getOne: "/api/admin/tasks",
  },
  members: {
    list: "/api/admin/members",
  },
  invitations: {
    list: "/api/admin/invitations",
    delete: "/api/admin/invitations",
  },
  "audit-logs": {
    list: "/api/admin/audit-logs",
  },
  stats: {
    list: "/api/admin/stats",
  },
};

// Helper to build query params for list requests
function buildQueryParams(params: {
  pagination?: { page: number; perPage: number };
  sort?: { field: string; order: string };
  filter?: Record<string, any>;
}): URLSearchParams {
  const { pagination, sort, filter } = params;
  const { page = 1, perPage = 25 } = pagination || {};
  const { field, order } = sort || {};

  const queryParams = new URLSearchParams({
    limit: perPage.toString(),
    offset: ((page - 1) * perPage).toString(),
  });

  if (field) {
    queryParams.append("sortBy", field);
    queryParams.append("sortDirection", (order || "ASC").toLowerCase());
  }

  // Handle filter params
  if (filter) {
    // Search text
    if (filter.q) {
      queryParams.append("search", filter.q);
    }
    // Specific filters
    Object.entries(filter).forEach(([key, value]) => {
      if (key !== "q" && value !== undefined && value !== null && value !== "") {
        queryParams.append(key, String(value));
      }
    });
  }

  return queryParams;
}

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    const endpoint = resourceEndpoints[resource]?.list;
    if (!endpoint) {
      throw new Error(`Unknown resource: ${resource}`);
    }

    // Special handling for users (Better Auth format)
    if (resource === "users") {
      const { pagination, sort, filter } = params;
      const { page = 1, perPage = 10 } = pagination || {};
      const { field, order } = sort || {};

      const queryParams = new URLSearchParams({
        limit: perPage.toString(),
        offset: ((page - 1) * perPage).toString(),
      });

      if (field) {
        queryParams.append("sortBy", field);
        queryParams.append("sortDirection", (order || "ASC").toLowerCase());
      }

      if (filter?.q) {
        queryParams.append("searchValue", filter.q);
        queryParams.append("searchField", "email");
        queryParams.append("searchOperator", "contains");
      }

      const response = await fetch(`${API_URL}${endpoint}?${queryParams}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return {
        data: data.users || [],
        total: data.total || 0,
      };
    }

    // Special handling for stats (no pagination)
    if (resource === "stats") {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: [data], total: 1 };
    }

    // Standard resource handling
    const queryParams = buildQueryParams(params);
    const response = await fetch(`${API_URL}${endpoint}?${queryParams}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return {
      data: result.data || [],
      total: result.total || 0,
    };
  },

  getOne: async (resource, params) => {
    const endpoint = resourceEndpoints[resource]?.getOne;

    // Users use list endpoint with filtering
    if (resource === "users") {
      const response = await fetch(`${API_URL}/api/auth/admin/list-users`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const user = data.users?.find((u: { id: string }) => u.id === params.id);

      if (!user) {
        throw new Error(`User not found: ${params.id}`);
      }

      return { data: user };
    }

    if (!endpoint) {
      throw new Error(`getOne not supported for resource: ${resource}`);
    }

    const response = await fetch(`${API_URL}${endpoint}/${params.id}`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { data: result.data };
  },

  getMany: async (resource, params) => {
    // For now, use getList and filter client-side
    const result = await dataProvider.getList(resource, {
      pagination: { page: 1, perPage: 1000 },
      sort: { field: "id", order: "ASC" },
      filter: {},
    });

    const filtered = result.data.filter((item: { id: string }) =>
      params.ids.includes(item.id)
    );

    return { data: filtered };
  },

  getManyReference: async (resource, params) => {
    // Use getList with filter
    return dataProvider.getList(resource, {
      pagination: params.pagination,
      sort: params.sort,
      filter: { ...params.filter, [params.target]: params.id },
    });
  },

  create: async (resource, params) => {
    const endpoint = resourceEndpoints[resource]?.create;
    if (!endpoint) {
      throw new Error(`create not supported for resource: ${resource}`);
    }

    // Users use special Better Auth endpoint
    if (resource === "users") {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(params.data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data.user || params.data };
    }

    // Standard POST
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { data: result.data || { ...params.data, id: result.id } };
  },

  update: async (resource, params) => {
    const endpoint = resourceEndpoints[resource]?.update;
    if (!endpoint) {
      throw new Error(`update not supported for resource: ${resource}`);
    }

    // Users use special Better Auth endpoint
    if (resource === "users") {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: params.id, ...params.data }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data: data.user || { ...params.data, id: params.id } };
    }

    // Standard PUT
    const response = await fetch(`${API_URL}${endpoint}/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { data: result.data || { ...params.data, id: params.id } };
  },

  updateMany: async (resource, params) => {
    const results = await Promise.all(
      params.ids.map((id) =>
        dataProvider.update(resource, {
          id,
          data: params.data,
          previousData: {},
        })
      )
    );
    return { data: results.map((r) => r.data) };
  },

  delete: async (resource, params) => {
    const endpoint = resourceEndpoints[resource]?.delete;
    if (!endpoint) {
      throw new Error(`delete not supported for resource: ${resource}`);
    }

    // Users use special Better Auth endpoint
    if (resource === "users") {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId: params.id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return { data: { id: params.id } as any };
    }

    // Invitations use DELETE with body
    if (resource === "invitations") {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: params.id }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Unknown error" }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return { data: { id: params.id } as any };
    }

    // Standard DELETE
    const response = await fetch(`${API_URL}${endpoint}/${params.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return { data: { id: params.id } as any };
  },

  deleteMany: async (resource, params) => {
    await Promise.all(
      params.ids.map((id) =>
        dataProvider.delete(resource, { id, previousData: {} as any })
      )
    );
    return { data: params.ids };
  },
};
