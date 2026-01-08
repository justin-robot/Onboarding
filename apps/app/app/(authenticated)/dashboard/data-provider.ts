"use client";

import type { DataProvider } from "ra-core";

const API_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const dataProvider: DataProvider = {
  getList: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

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

    const response = await fetch(`${API_URL}/api/auth/admin/list-users?${queryParams}`, {
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
  },

  getOne: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

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
  },

  getMany: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

    const response = await fetch(`${API_URL}/api/auth/admin/list-users`, {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const users = data.users?.filter((u: { id: string }) =>
      params.ids.includes(u.id)
    ) || [];

    return { data: users };
  },

  getManyReference: async () => {
    throw new Error("getManyReference not implemented");
  },

  create: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

    const response = await fetch(`${API_URL}/api/auth/admin/create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(params.data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return { data: data.user || params.data };
  },

  update: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

    const response = await fetch(`${API_URL}/api/auth/admin/update-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId: params.id,
        ...params.data,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return { data: data.user || { ...params.data, id: params.id } };
  },

  updateMany: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

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
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

    const response = await fetch(`${API_URL}/api/auth/admin/delete-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        userId: params.id,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return { data: { id: params.id } as any };
  },

  deleteMany: async (resource, params) => {
    if (resource !== "users") {
      throw new Error(`Unknown resource: ${resource}`);
    }

    await Promise.all(
      params.ids.map((id) => dataProvider.delete(resource, { id, previousData: {} as any }))
    );

    return { data: params.ids };
  },
};
