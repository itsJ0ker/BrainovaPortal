import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import School from "@/models/School";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";

describe("Multi-Tenant Isolation Architecture", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    await School.init();
    await Student.init();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it("strictly partitions student records by schoolId and prohibits cross-tenant leakage", async () => {
    const schoolA = await School.create({
      name: "St. Jude Academy",
      slug: "st-jude",
      code: "STJ-01",
      adminEmail: "admin@stjude.org",
      contactEmail: "admin@stjude.org",
      status: "active",
    });

    const schoolB = await School.create({
      name: "Oakridge Collegiate",
      slug: "oakridge",
      code: "OAK-02",
      adminEmail: "admin@oakridge.edu",
      contactEmail: "admin@oakridge.edu",
      status: "active",
    });

    // Add student to School A
    await Student.create({
      schoolId: schoolA._id,
      name: "Alice Montgomery",
      rollNumber: "ROLL-001",
      admissionNumber: "ADM-001",
      email: "alice@stjude.org",
      classGrade: "Grade 10",
      section: "A",
    });

    // Add student with the SAME roll number to School B (allowed because roll numbers are isolated per school!)
    await Student.create({
      schoolId: schoolB._id,
      name: "Bob Henderson",
      rollNumber: "ROLL-001",
      admissionNumber: "ADM-999",
      email: "bob@oakridge.edu",
      classGrade: "Grade 10",
      section: "A",
    });

    // Query students scoped to School A
    const schoolAStudents = await Student.find({ schoolId: schoolA._id });
    expect(schoolAStudents.length).toBe(1);
    expect(schoolAStudents[0].name).toBe("Alice Montgomery");

    // Query students scoped to School B
    const schoolBStudents = await Student.find({ schoolId: schoolB._id });
    expect(schoolBStudents.length).toBe(1);
    expect(schoolBStudents[0].name).toBe("Bob Henderson");

    // Verify school A query NEVER returns school B students
    const leakCheck = await Student.find({ schoolId: schoolA._id, name: "Bob Henderson" });
    expect(leakCheck.length).toBe(0);
  });

  it("enforces unique roll numbers within the same school", async () => {
    const school = await School.findOne({ slug: "st-jude" });
    expect(school).toBeTruthy();

    // Attempting to add duplicate roll number to the SAME school should violate compound index or validation
    let threwError = false;
    try {
      await Student.create({
        schoolId: school!._id,
        name: "Charlie Brown",
        rollNumber: "ROLL-001", // Duplicate within school A
        admissionNumber: "ADM-002",
        email: "charlie@stjude.org",
        classGrade: "Grade 10",
        section: "B",
      });
    } catch (err: any) {
      threwError = true;
    }

    // Either Mongoose duplicate key error or pre-check enforces this
    expect(threwError).toBe(true);
  });
});
