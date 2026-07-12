import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

async function createAdmin() {
  console.log("=== Creating Admin User ===");

  const email = "admin@fintrust.com";
  const password = "adminpassword123";

  // Check if admin already exists
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email)
  });

  if (existing) {
    console.log("Admin user already exists. Updating role, email verification, and resetting password...");
    const passwordHash = await hashPassword(password);
    await db.update(usersTable)
      .set({ role: "admin", emailVerified: true, passwordHash })
      .where(eq(usersTable.id, existing.id));
    console.log(`Admin user email: ${email}`);
    console.log(`Password reset to: ${password}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  
  const [admin] = await db.insert(usersTable).values({
    name: "System Admin",
    email,
    passwordHash,
    role: "admin",
    title: "System Administrator",
    bio: "Fintrust+ Platform Administrator",
    emailVerified: true,
  }).returning();

  console.log("Admin user created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

createAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
