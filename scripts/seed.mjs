// Standalone CLI seed runner
import { seedDatabase } from "../src/lib/seed-data.ts";

async function run() {
  console.log("Seeding database with multi-school test environments...");
  try {
    const res = await seedDatabase();
    console.log("Successfully seeded schools:", res.schools.map((s) => s.name).join(", "));
    console.log("Ready for testing and demonstration.");
    process.exit(0);
  } catch (err) {
    console.error("Seeding error:", err);
    process.exit(1);
  }
}

run();
