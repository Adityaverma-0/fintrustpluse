import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { hashPassword } from "./lib/auth";

async function createSuperAdmin() {
  console.log("=== Creating Super Admin User ===");

  const email = "superadmin@fintrust.com";
  const password = "superadminpassword123";

  // Check if admin already exists
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, email)
  });

  if (existing) {
    console.log("Super Admin user already exists. Resetting role and password...");
    const passwordHash = await hashPassword(password);
    await db.update(usersTable)
      .set({ role: "admin", emailVerified: true, passwordHash })
      .where(eq(usersTable.id, existing.id));
    console.log(`Email: ${email}`);
    console.log(`Password reset to: ${password}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  
  const [admin] = await db.insert(usersTable).values({
    name: "Super Administrator",
    email,
    passwordHash,
    role: "admin",
    title: "Super Administrator",
    bio: "Fintrust+ Platform Executive Administrator",
    emailVerified: true,
  }).returning();

  console.log("Super Admin user created successfully!");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

createSuperAdmin().catch((err) => {
  console.error("Failed to create super admin:", err);
  process.exit(1);
});
