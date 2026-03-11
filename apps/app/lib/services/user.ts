import { database } from "@repo/database";
import type { User, UserUpdate } from "@repo/database";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  username: string | null;
  image: string | null;
  role: "admin" | "user" | null;
}

export interface UpdateProfileInput {
  name?: string;
  username?: string | null;
}

export const userService = {
  /**
   * Get user by ID
   */
  async getById(userId: string): Promise<User | null> {
    const user = await database
      .selectFrom("user")
      .selectAll()
      .where("id", "=", userId)
      .executeTakeFirst();
    return user ?? null;
  },

  /**
   * Get user profile (safe subset of fields)
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await database
      .selectFrom("user")
      .select(["id", "name", "email", "username", "image", "role"])
      .where("id", "=", userId)
      .executeTakeFirst();
    return user ?? null;
  },

  /**
   * Update user profile fields
   */
  async updateProfile(
    userId: string,
    input: UpdateProfileInput
  ): Promise<UserProfile | null> {
    const updateData: UserUpdate = {
      updatedAt: new Date(),
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.username !== undefined) {
      updateData.username = input.username;
    }

    await database
      .updateTable("user")
      .set(updateData)
      .where("id", "=", userId)
      .execute();

    return this.getProfile(userId);
  },

  /**
   * Check if a username is already taken (by another user)
   */
  async isUsernameTaken(
    username: string,
    excludeUserId?: string
  ): Promise<boolean> {
    let query = database
      .selectFrom("user")
      .select("id")
      .where("username", "=", username);

    if (excludeUserId) {
      query = query.where("id", "!=", excludeUserId);
    }

    const existing = await query.executeTakeFirst();
    return !!existing;
  },
};
