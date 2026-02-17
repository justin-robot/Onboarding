export const GET = async () => {
  const { database } = await import("@repo/database");
  await database.selectFrom("user").select("id").limit(1).execute();

  return new Response("OK", { status: 200 });
};
