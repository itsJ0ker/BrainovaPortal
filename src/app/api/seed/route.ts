import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/seed-data";

export async function POST() {
  try {
    const data = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: "Database seeded successfully with demo schools, exams, and students.",
      schools: data.schools.map((s: any) => ({ id: s._id, name: s.name, slug: s.slug })),
      exams: data.exams.map((e: any) => ({ id: e._id, title: e.title, accessCode: e.accessCode })),
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
