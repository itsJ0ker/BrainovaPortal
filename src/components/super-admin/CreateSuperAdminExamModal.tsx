"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { IQuestion, IQuestionOption, QuestionType } from "@/types";
import {
  toISTInputString,
  istInputToISO,
  formatInIST,
  getTomorrow9AMIST,
  addDaysToISTInput,
  IST_BADGE,
} from "@/lib/timezone";
import { POINT_PRESETS, NEGATIVE_POINT_PRESETS } from "@/lib/constants";
import {
  Building2,
  Calendar,
  Clock,
  Shield,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Globe,
  Layers,
  ArrowRight,
  ArrowLeft,
  X,
  FileQuestion,
  Check,
} from "lucide-react";

interface CreateSuperAdminExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  schools: any[];
  onExamCreated: () => void;
}

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "Science & Logic",
  "Computer Science & AI",
  "Physics",
  "Chemistry",
  "Biology",
  "Cyber Olympiad",
  "English & Verbal Reasoning",
  "General Knowledge",
];

const DEFAULT_CLASSES = [
  "All Classes",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
];

export function CreateSuperAdminExamModal({
  isOpen,
  onClose,
  schools,
  onExamCreated,
}: CreateSuperAdminExamModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Participating Schools & Identity
  const [isAllSchools, setIsAllSchools] = useState(true);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECTS[0]);
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [customSubjectText, setCustomSubjectText] = useState("");
  const [classGrade, setClassGrade] = useState("Grade 10");
  const [customAccessCode, setCustomAccessCode] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Schedule & Security
  const defaultDates = getTomorrow9AMIST();
  const [startTimeInput, setStartTimeInput] = useState<string>(defaultDates.start);
  const [endTimeInput, setEndTimeInput] = useState<string>(defaultDates.end3Days);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [resultReleaseMode, setResultReleaseMode] = useState<"immediate" | "manual">("immediate");
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(true);
  const [maxViolations, setMaxViolations] = useState(3);
  const [actionOnThreshold, setActionOnThreshold] = useState<"auto_submit" | "flag">("auto_submit");
  const [blockCopyPaste, setBlockCopyPaste] = useState(true);
  const [detectTabSwitch, setDetectTabSwitch] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [shuffleOptions, setShuffleOptions] = useState(true);

  // Step 3: Questions
  const [questions, setQuestions] = useState<IQuestion[]>([]);

  // Initialize schools
  useEffect(() => {
    if (schools.length > 0) {
      setSelectedSchoolIds(schools.map((s) => s._id.toString()));
    }
  }, [schools]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setError("");
      setTitle("Brainova National Science & Logic Olympiad");
      setDescription("Official national inter-school Olympiad examination hosted by Brainova Olympiad Consortium.");
      setCustomAccessCode(`NAT-${Math.floor(100 + Math.random() * 900)}`);
      if (questions.length === 0) {
        loadSampleQuestions();
      }
    }
  }, [isOpen]);

  const loadSampleQuestions = () => {
    setQuestions([
      {
        id: "q_1",
        type: "single_choice",
        prompt: "What is the primary unit of electric potential difference in the International System of Units (SI)?",
        options: [
          { id: "opt_volt", text: "Volt (V)" },
          { id: "opt_ampere", text: "Ampere (A)" },
          { id: "opt_watt", text: "Watt (W)" },
          { id: "opt_ohm", text: "Ohm (Ω)" },
        ],
        correctAnswer: "opt_volt",
        points: 4,
        negativePoints: 1,
        explanation: "1 Volt = 1 Joule per Coulomb.",
      },
      {
        id: "q_2",
        type: "multiple_choice",
        prompt: "Which of the following are fundamental vector quantities in classical physics? (Select all that apply)",
        options: [
          { id: "opt_vel", text: "Velocity" },
          { id: "opt_mass", text: "Mass" },
          { id: "opt_acc", text: "Acceleration" },
          { id: "opt_temp", text: "Temperature" },
        ],
        correctAnswer: ["opt_vel", "opt_acc"],
        points: 4,
        negativePoints: 1,
        explanation: "Velocity and acceleration have both magnitude and direction, whereas mass and temperature are scalars.",
      },
      {
        id: "q_3",
        type: "true_false",
        prompt: "Every prime number strictly greater than 2 is an odd number.",
        options: [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ],
        correctAnswer: "true",
        points: 2,
        negativePoints: 0,
        explanation: "2 is the only even prime number; all others are divisible by 2 if even.",
      },
      {
        id: "q_4",
        type: "written",
        prompt: "Derive the formula for kinetic energy (KE = 1/2 m v²) from Newton's second law and the work-energy theorem.",
        points: 10,
        negativePoints: 0,
        rubric: "Full credit (10 marks) for correctly integrating W = ∫ F dx = ∫ m (v dv/dt) dx = ∫ m v dv = 1/2 m v². Partial marks (5 marks) for verbal explanation without integral calculus.",
        explanation: "Work done on an object by the net force equals change in kinetic energy: W = ∫ F dx = m ∫ v dv = 1/2 m v².",
      },
    ]);
  };

  const handleToggleSchool = (schoolId: string) => {
    if (selectedSchoolIds.includes(schoolId)) {
      if (selectedSchoolIds.length === 1) return; // Must keep at least one
      setSelectedSchoolIds(selectedSchoolIds.filter((id) => id !== schoolId));
      setIsAllSchools(false);
    } else {
      const next = [...selectedSchoolIds, schoolId];
      setSelectedSchoolIds(next);
      if (next.length === schools.length) {
        setIsAllSchools(true);
      }
    }
  };

  const handleToggleAllSchools = (checked: boolean) => {
    setIsAllSchools(checked);
    if (checked) {
      setSelectedSchoolIds(schools.map((s) => s._id.toString()));
    }
  };

  const addQuestion = (type: QuestionType = "single_choice") => {
    const qId = `q_${Date.now()}`;
    if (type === "single_choice") {
      setQuestions((prev) => [
        ...prev,
        {
          id: qId,
          type: "single_choice",
          prompt: "Enter question statement here...",
          options: [
            { id: "opt_a", text: "Option A" },
            { id: "opt_b", text: "Option B" },
            { id: "opt_c", text: "Option C" },
            { id: "opt_d", text: "Option D" },
          ],
          correctAnswer: "opt_a",
          points: 4,
          negativePoints: 1,
          explanation: "",
        },
      ]);
    } else if (type === "multiple_choice") {
      setQuestions((prev) => [
        ...prev,
        {
          id: qId,
          type: "multiple_choice",
          prompt: "Select all applicable statements / correct answers...",
          options: [
            { id: "opt_a", text: "Statement A" },
            { id: "opt_b", text: "Statement B" },
            { id: "opt_c", text: "Statement C" },
            { id: "opt_d", text: "Statement D" },
          ],
          correctAnswer: ["opt_a"],
          points: 4,
          negativePoints: 1,
          explanation: "",
        },
      ]);
    } else if (type === "true_false") {
      setQuestions((prev) => [
        ...prev,
        {
          id: qId,
          type: "true_false",
          prompt: "Enter statement to verify as True or False...",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ],
          correctAnswer: "true",
          points: 2,
          negativePoints: 0,
          explanation: "",
        },
      ]);
    } else if (type === "written") {
      setQuestions((prev) => [
        ...prev,
        {
          id: qId,
          type: "written",
          prompt: "Enter subjective question prompt or complex problem...",
          points: 10,
          negativePoints: 0,
          rubric: "Full marks for complete step-by-step derivation and final unit.",
          explanation: "",
        },
      ]);
    }
  };

  const changeQuestionType = (qId: string, newType: QuestionType) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId) return q;
        if (newType === "true_false") {
          return {
            ...q,
            type: newType,
            options: [
              { id: "true", text: "True" },
              { id: "false", text: "False" },
            ],
            correctAnswer: "true",
            points: q.points || 2,
            negativePoints: 0,
          };
        } else if (newType === "written") {
          return {
            ...q,
            type: newType,
            options: undefined,
            correctAnswer: undefined,
            points: q.points || 10,
            negativePoints: 0,
            rubric: q.rubric || "Grade based on accurate conceptual explanation and supporting steps.",
          };
        } else if (newType === "single_choice") {
          const defaultOpts =
            q.options && q.options.length >= 2 && q.options[0].id !== "true"
              ? q.options
              : [
                  { id: "opt_a", text: "Option A" },
                  { id: "opt_b", text: "Option B" },
                  { id: "opt_c", text: "Option C" },
                  { id: "opt_d", text: "Option D" },
                ];
          const correct = Array.isArray(q.correctAnswer)
            ? q.correctAnswer[0] || defaultOpts[0].id
            : defaultOpts.some((o) => o.id === q.correctAnswer)
            ? q.correctAnswer
            : defaultOpts[0].id;
          return {
            ...q,
            type: newType,
            options: defaultOpts,
            correctAnswer: correct,
            points: q.points || 4,
            negativePoints: q.negativePoints !== undefined ? q.negativePoints : 1,
          };
        } else if (newType === "multiple_choice") {
          const defaultOpts =
            q.options && q.options.length >= 2 && q.options[0].id !== "true"
              ? q.options
              : [
                  { id: "opt_a", text: "Option A" },
                  { id: "opt_b", text: "Option B" },
                  { id: "opt_c", text: "Option C" },
                  { id: "opt_d", text: "Option D" },
                ];
          const correct = Array.isArray(q.correctAnswer)
            ? q.correctAnswer.length > 0
              ? q.correctAnswer
              : [defaultOpts[0].id]
            : [q.correctAnswer || defaultOpts[0].id];
          return {
            ...q,
            type: newType,
            options: defaultOpts,
            correctAnswer: correct,
            points: q.points || 4,
            negativePoints: q.negativePoints !== undefined ? q.negativePoints : 1,
          };
        }
        return q;
      })
    );
  };

  const addOptionToQuestion = (qId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || !q.options) return q;
        if (q.options.length >= 6) return q;
        const nextLetter = String.fromCharCode(97 + q.options.length);
        const newOpt: IQuestionOption = {
          id: `opt_${Date.now()}_${nextLetter}`,
          text: `Option ${nextLetter.toUpperCase()}`,
        };
        return {
          ...q,
          options: [...q.options, newOpt],
        };
      })
    );
  };

  const removeOptionFromQuestion = (qId: string, optId: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== qId || !q.options || q.options.length <= 2) return q;
        const newOpts = q.options.filter((o) => o.id !== optId);
        let newCorrect = q.correctAnswer;
        if (Array.isArray(q.correctAnswer)) {
          newCorrect = q.correctAnswer.filter((c) => c !== optId);
          if (newCorrect.length === 0 && newOpts.length > 0) {
            newCorrect = [newOpts[0].id];
          }
        } else if (q.correctAnswer === optId) {
          newCorrect = newOpts[0]?.id || "";
        }
        return {
          ...q,
          options: newOpts,
          correctAnswer: newCorrect,
        };
      })
    );
  };

  const removeQuestion = (qId: string) => {
    if (questions.length <= 1) return;
    setQuestions((prev) => prev.filter((q) => q.id !== qId));
  };

  const updateQuestion = (qId: string, updates: Partial<IQuestion>) => {
    setQuestions((prev) => prev.map((q) => (q.id === qId ? { ...q, ...updates } : q)));
  };

  const handleValidateStep = (targetStep: number): boolean => {
    setError("");
    if (step === 1 && targetStep > 1) {
      const finalSubject = isCustomSubject ? customSubjectText.trim() : subject;
      if (!title.trim()) {
        setError("Please enter an examination title.");
        return false;
      }
      if (!finalSubject) {
        setError("Please select or enter a subject.");
        return false;
      }
      if (!isAllSchools && selectedSchoolIds.length === 0) {
        setError("Please select at least one participating institution.");
        return false;
      }
    }
    if (step === 3 && targetStep > 3) {
      if (questions.length === 0) {
        setError("Please add at least one question.");
        return false;
      }
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        if (!q.prompt.trim()) {
          setError(`Question #${i + 1} has an empty question statement.`);
          return false;
        }
        if (q.type === "single_choice" || q.type === "multiple_choice") {
          if (!q.options || q.options.length < 2) {
            setError(`Question #${i + 1} must have at least 2 options.`);
            return false;
          }
          if (q.options.some((o) => !o.text.trim())) {
            setError(`Question #${i + 1} contains an empty option.`);
            return false;
          }
          if (!q.correctAnswer || (Array.isArray(q.correctAnswer) && q.correctAnswer.length === 0)) {
            setError(`Question #${i + 1} requires at least one option selected as the correct answer.`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleCreateExam = async (publishStatus: "draft" | "published") => {
    const finalSubject = isCustomSubject ? customSubjectText.trim() : subject;
    if (!title.trim() || !finalSubject) {
      setError("Exam Title and Subject are mandatory.");
      setStep(1);
      return;
    }

    if (!handleValidateStep(4)) {
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const payload = {
        title: title.trim(),
        subject: finalSubject,
        classGrade: classGrade.trim(),
        description: description.trim(),
        customAccessCode: customAccessCode.trim(),
        isPlatformExam: isAllSchools || selectedSchoolIds.length === schools.length,
        participatingSchoolIds: isAllSchools
          ? schools.map((s) => s._id.toString())
          : selectedSchoolIds,
        durationMinutes,
        startTime: istInputToISO(startTimeInput),
        endTime: istInputToISO(endTimeInput),
        status: publishStatus,
        resultReleaseMode,
        config: {
          shuffleQuestions,
          shuffleOptions,
        },
        antiCheating: {
          enabled: antiCheatingEnabled,
          maxViolations,
          actionOnThreshold,
          blockCopyPaste,
          detectTabSwitch,
        },
        questions,
      };

      const res = await fetch("/api/super-admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to create national examination.");
        return;
      }

      onExamCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while creating the exam.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create National / Partner School Examination"
      description="Author and deploy an inter-school Olympiad examination across participating institutions."
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Step Progression Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          {[
            { num: 1, label: "1. Institutions & Info" },
            { num: 2, label: "2. Schedule & Security" },
            { num: 3, label: "3. Questions Blueprint" },
            { num: 4, label: "4. Review & Deploy" },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => {
                if (s.num > step) {
                  if (handleValidateStep(s.num)) {
                    setStep(s.num as any);
                  }
                } else {
                  setError("");
                  setStep(s.num as any);
                }
              }}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                step === s.num
                  ? "text-indigo-600 border-b-2 border-indigo-600 pb-1 -mb-[13px]"
                  : step > s.num
                  ? "text-emerald-600"
                  : "text-slate-400"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === s.num
                    ? "bg-indigo-600 text-white"
                    : step > s.num
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {s.num}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Participating Schools & Identity */}
        {step === 1 && (
          <div className="space-y-5">
            {/* School Selection Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    Participating Institutions
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold text-indigo-700 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={isAllSchools}
                    onChange={(e) => handleToggleAllSchools(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                  />
                  <span>🌟 Select All Schools ({schools.length})</span>
                </label>
              </div>

              <p className="text-[11px] text-slate-600">
                Choose whether this examination is a nationwide consortium contest for all institutions, or designated for specific partner schools.
              </p>

              {/* Multi-School Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {schools.map((school) => {
                  const isChecked = selectedSchoolIds.includes(school._id.toString());
                  return (
                    <label
                      key={school._id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? "bg-white border-indigo-300 shadow-2xs text-slate-900 font-semibold"
                          : "bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleSchool(school._id.toString())}
                        className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{school.name}</span>
                      <span className="ml-auto text-[9px] font-mono text-slate-400">{school.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Basic Info Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Examination Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. All-India Mathematics Olympiad Prelims"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Subject *</label>
                {!isCustomSubject ? (
                  <div className="flex gap-2">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {DEFAULT_SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsCustomSubject(true)}
                      className="px-2.5 py-1.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      Custom
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSubjectText}
                      onChange={(e) => setCustomSubjectText(e.target.value)}
                      placeholder="Enter subject..."
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => setIsCustomSubject(false)}
                      className="px-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Target Grade Cohort</label>
                <select
                  value={classGrade}
                  onChange={(e) => setClassGrade(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {DEFAULT_CLASSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Access Code (Candidate Entry)</label>
                <input
                  type="text"
                  value={customAccessCode}
                  onChange={(e) => setCustomAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. OLYMP-2026"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs font-bold text-indigo-700 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Description (Optional)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="General contest rules or guidelines..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Schedule & Security */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                All testing window times are authoritatively scheduled in <strong>Indian Standard Time (IST - Asia/Kolkata)</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Start Time (IST)</label>
                <input
                  type="datetime-local"
                  value={startTimeInput}
                  onChange={(e) => setStartTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">End Time (IST)</label>
                <input
                  type="datetime-local"
                  value={endTimeInput}
                  onChange={(e) => setEndTimeInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Quick Window Presets */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-bold text-[11px]">Quick Windows:</span>
              <button
                type="button"
                onClick={() => {
                  const nowStr = toISTInputString(new Date());
                  setStartTimeInput(nowStr);
                  setEndTimeInput(addDaysToISTInput(nowStr, 3));
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Start Now (3 Days)
              </button>
              <button
                type="button"
                onClick={() => {
                  const nowStr = toISTInputString(new Date());
                  setStartTimeInput(nowStr);
                  setEndTimeInput(addDaysToISTInput(nowStr, 7));
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                Start Now (1 Week)
              </button>
              <button
                type="button"
                onClick={() => {
                  const { start, end3Days } = getTomorrow9AMIST();
                  setStartTimeInput(start);
                  setEndTimeInput(end3Days);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200"
              >
                Tomorrow 9:00 AM (3 Days)
              </button>
            </div>

            {/* Result Release Mode */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <label className="text-xs font-bold text-slate-900 block">Candidate Result Release Policy</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resultReleaseMode === "immediate"
                      ? "bg-white border-indigo-400 shadow-2xs"
                      : "bg-white/50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="resultMode"
                    checked={resultReleaseMode === "immediate"}
                    onChange={() => setResultReleaseMode("immediate")}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Instant Result Release</span>
                    <span className="text-[11px] text-slate-500">
                      Scorecard & official distinction certificate unlock immediately upon submission.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    resultReleaseMode === "manual"
                      ? "bg-white border-indigo-400 shadow-2xs"
                      : "bg-white/50 border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name="resultMode"
                    checked={resultReleaseMode === "manual"}
                    onChange={() => setResultReleaseMode("manual")}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Shielded (Manual Release)</span>
                    <span className="text-[11px] text-slate-500">
                      Scores remain hidden until administrator releases all results simultaneously.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Anti-Cheating Toggles */}
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Anti-Cheating & Integrity Engine</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={antiCheatingEnabled}
                    onChange={(e) => setAntiCheatingEnabled(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-bold text-slate-700">Enforce Safeguards</span>
                </label>
              </div>

              {antiCheatingEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Violation Limit</span>
                    <select
                      value={maxViolations}
                      onChange={(e) => setMaxViolations(Number(e.target.value))}
                      className="w-full p-1 rounded-lg border border-slate-200 text-xs font-semibold"
                    >
                      <option value={2}>2 Warnings</option>
                      <option value={3}>3 Warnings (Recommended)</option>
                      <option value={5}>5 Warnings</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                    <span className="text-[11px] font-bold text-slate-700 block">Action on Threshold</span>
                    <select
                      value={actionOnThreshold}
                      onChange={(e) => setActionOnThreshold(e.target.value as any)}
                      className="w-full p-1 rounded-lg border border-slate-200 text-xs font-semibold"
                    >
                      <option value="auto_submit">Auto-Submit Exam</option>
                      <option value="flag">Flag & Continue</option>
                    </select>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Block Copy/Paste</span>
                      <span className="text-[9px] text-slate-400">Lock prompt copying</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={blockCopyPaste}
                      onChange={(e) => setBlockCopyPaste(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Tab Switch Detection</span>
                      <span className="text-[9px] text-slate-400">Monitor focus loss</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={detectTabSwitch}
                      onChange={(e) => setDetectTabSwitch(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Shuffle Questions</span>
                      <span className="text-[9px] text-slate-400">Random seed per candidate</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block">Shuffle Options</span>
                      <span className="text-[9px] text-slate-400">Randomize MCQs</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Questions Blueprint */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-800">
                  Questions: <strong className="text-indigo-600 font-mono">{questions.length}</strong>
                </span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-800">
                  Total Marks: <strong className="text-indigo-600 font-mono">{totalPoints}</strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={loadSampleQuestions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Preset Olympiad Questions</span>
                </button>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => addQuestion("single_choice")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors shadow-2xs"
                    title="Add Single Choice MCQ"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>+ Single MCQ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion("multiple_choice")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors shadow-2xs"
                    title="Add Multi-Select Question"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>+ Multi-Select</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion("true_false")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors shadow-2xs"
                    title="Add True / False Question"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>+ True/False</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => addQuestion("written")}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors shadow-2xs"
                    title="Add Written / Essay Question"
                  >
                    <Plus className="w-3 h-3 text-emerald-400" />
                    <span>+ Written</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {questions.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                  <FileQuestion className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No questions added yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Click one of the buttons above to add Single Choice MCQ, Multi-Select, True/False, or Written questions, or load the Olympiad presets.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => addQuestion("single_choice")}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
                    >
                      + Add First MCQ
                    </button>
                    <button
                      type="button"
                      onClick={loadSampleQuestions}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
                    >
                      Load Sample Set
                    </button>
                  </div>
                </div>
              ) : (
                questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-2xl border border-slate-200 bg-white shadow-2xs space-y-3.5 transition-all hover:border-slate-300"
                  >
                    {/* Top Row: Q Number, Type Switcher, Points, Negative, Delete */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>

                        {/* Question Type Selector */}
                        <select
                          value={q.type}
                          onChange={(e) => changeQuestionType(q.id, e.target.value as QuestionType)}
                          className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="single_choice">🔘 Single Choice (MCQ)</option>
                          <option value="multiple_choice">☑️ Multiple Choice (Multi-Select)</option>
                          <option value="true_false">⚖️ True / False</option>
                          <option value="written">📝 Written / Subjective</option>
                        </select>
                      </div>

                      {/* Marking Scheme Controls */}
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Points Presets */}
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500 font-medium text-[11px]">Marks:</span>
                          <div className="flex items-center gap-0.5">
                            {POINT_PRESETS.map((pts) => (
                              <button
                                key={pts}
                                type="button"
                                onClick={() => updateQuestion(q.id, { points: pts })}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                  q.points === pts
                                    ? "bg-indigo-600 border-indigo-600 text-white"
                                    : "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300"
                                }`}
                              >
                                {pts}
                              </button>
                            ))}
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={q.points}
                              onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) || 1 })}
                              className="w-10 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-[11px] text-center font-bold text-slate-900 focus:outline-none"
                            />
                          </div>
                        </div>

                        {/* Negative Marking (MCQ & True/False only) */}
                        {q.type !== "written" && (
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-slate-500 font-medium text-[11px]">Negative:</span>
                            <div className="flex items-center gap-0.5">
                              {NEGATIVE_POINT_PRESETS.map((npts) => (
                                <button
                                  key={npts}
                                  type="button"
                                  onClick={() => updateQuestion(q.id, { negativePoints: npts })}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                                    q.negativePoints === npts
                                      ? "bg-rose-50 border-rose-300 text-rose-700 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                                  }`}
                                >
                                  -{npts}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => removeQuestion(q.id)}
                          disabled={questions.length <= 1}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-30"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <textarea
                        rows={2}
                        value={q.prompt}
                        onChange={(e) => updateQuestion(q.id, { prompt: e.target.value })}
                        placeholder="Enter question statement, formula, or problem description..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs font-medium"
                      />
                    </div>

                    {/* TRUE / FALSE Cards */}
                    {q.type === "true_false" && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-slate-600">
                          Select Correct Answer Key (Click card):
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id, { correctAnswer: "true" })}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                              q.correctAnswer === "true"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>TRUE</span>
                            </div>
                            {q.correctAnswer === "true" && (
                              <span className="text-[9px] uppercase tracking-wider bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-black">
                                Correct Key
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => updateQuestion(q.id, { correctAnswer: "false" })}
                            className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all ${
                              q.correctAnswer === "false"
                                ? "border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-500/20"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <X className="w-4 h-4 text-rose-600" />
                              <span>FALSE</span>
                            </div>
                            {q.correctAnswer === "false" && (
                              <span className="text-[9px] uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded font-black">
                                Correct Key
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* MCQ Options with Add/Remove option controls (Single & Multiple Choice) */}
                    {(q.type === "single_choice" || q.type === "multiple_choice") && q.options && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold text-slate-600">
                            {q.type === "single_choice"
                              ? "Options (Select the radio of the correct answer):"
                              : "Options (Check all boxes for correct answers):"}
                          </p>
                          <button
                            type="button"
                            onClick={() => addOptionToQuestion(q.id)}
                            disabled={(q.options?.length || 0) >= 6}
                            className="rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 text-[11px] text-indigo-700 font-bold disabled:opacity-40 transition-colors"
                          >
                            + Add Choice ({q.options.length}/6)
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = Array.isArray(q.correctAnswer)
                              ? q.correctAnswer.includes(opt.id)
                              : q.correctAnswer === opt.id;
                            const optionLetter = String.fromCharCode(65 + optIdx);

                            return (
                              <div
                                key={opt.id}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                                  isCorrect
                                    ? "border-emerald-500 bg-emerald-50/80 text-emerald-950 ring-1 ring-emerald-500/30 font-medium"
                                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300"
                                }`}
                              >
                                <input
                                  type={q.type === "multiple_choice" ? "checkbox" : "radio"}
                                  name={`correct_${q.id}`}
                                  checked={isCorrect}
                                  onChange={() => {
                                    if (q.type === "multiple_choice") {
                                      const current = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
                                      const next = current.includes(opt.id)
                                        ? current.filter((x) => x !== opt.id)
                                        : [...current, opt.id];
                                      updateQuestion(q.id, { correctAnswer: next });
                                    } else {
                                      updateQuestion(q.id, { correctAnswer: opt.id });
                                    }
                                  }}
                                  className="text-emerald-600 focus:ring-0 w-4 h-4 cursor-pointer"
                                />

                                <span className="font-bold text-slate-500 font-mono text-xs">
                                  {optionLetter}.
                                </span>

                                <input
                                  type="text"
                                  value={opt.text}
                                  onChange={(e) => {
                                    const newOpts = q.options?.map((o) =>
                                      o.id === opt.id ? { ...o, text: e.target.value } : o
                                    );
                                    updateQuestion(q.id, { options: newOpts });
                                  }}
                                  className="bg-transparent border-none flex-1 text-xs text-slate-900 focus:outline-none font-medium"
                                  placeholder={`Choice ${optionLetter} text...`}
                                />

                                {q.options && q.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOptionFromQuestion(q.id, opt.id)}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Remove option"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Written Rubric & Evaluation Criteria */}
                    {q.type === "written" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-slate-600">
                            Grading Rubric & Evaluation Key (Teacher/Admin Guide):
                          </label>
                          <span className="text-[10px] text-slate-400">Click to append preset:</span>
                        </div>
                        <textarea
                          rows={2}
                          value={q.rubric || ""}
                          onChange={(e) => updateQuestion(q.id, { rubric: e.target.value })}
                          placeholder="Criteria for awarding full vs partial marks during manual grading..."
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {[
                            "+ Accuracy 50%",
                            "+ Methodology 30%",
                            "+ Step-by-step working 20%",
                            "+ Full credit for correct final unit",
                          ].map((rub) => (
                            <button
                              key={rub}
                              type="button"
                              onClick={() => {
                                updateQuestion(q.id, {
                                  rubric: q.rubric ? `${q.rubric} | ${rub}` : rub,
                                });
                              }}
                              className="rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 transition-colors"
                            >
                              {rub}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Explanation / Solution Key */}
                    <div className="pt-1">
                      <input
                        type="text"
                        value={q.explanation || ""}
                        onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                        placeholder="Optional explanation / solution rationale (shown to students upon result release)..."
                        className="w-full px-3 py-1.5 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:border-indigo-400 bg-slate-50/50"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Review & Deploy */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">{title}</h3>
                  <p className="text-xs text-slate-500 font-medium">{subject} • {classGrade}</p>
                </div>
                <span className="px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold">
                  Code: {customAccessCode || "AUTO"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Enrolled Institutions</span>
                  <p className="font-bold text-slate-900">
                    {isAllSchools ? `All Schools (${schools.length})` : `${selectedSchoolIds.length} Schools`}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Duration</span>
                  <p className="font-bold text-slate-900">{durationMinutes} Minutes</p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Total Questions</span>
                  <p className="font-bold text-slate-900">{questions.length} Items ({totalPoints} Pts)</p>
                </div>

                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-0.5">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Result Release</span>
                  <p className="font-bold text-emerald-600 capitalize">{resultReleaseMode}</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Testing Window (IST):</span>
                  <span className="font-mono text-slate-500">
                    {formatInIST(istInputToISO(startTimeInput))} — {formatInIST(istInputToISO(endTimeInput))}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">Anti-Cheating Policy:</span>
                  <span className="text-emerald-700 font-semibold">
                    {antiCheatingEnabled ? `Active (Threshold: ${maxViolations} warnings)` : "Disabled"}
                  </span>
                </div>
              </div>

              {/* Question Breakdown Preview */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">Questions Blueprint Summary</span>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="font-mono font-bold text-slate-400">Q{idx + 1}.</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                          {q.type.replace("_", " ")}
                        </span>
                        <span className="truncate text-slate-700 font-medium">{q.prompt}</span>
                      </div>
                      <span className="font-bold text-indigo-700 flex-shrink-0">{q.points} Pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 4 ? (
              <button
                type="button"
                onClick={() => {
                  if (handleValidateStep(step + 1)) {
                    setStep((step + 1) as any);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCreateExam("draft")}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCreateExam("published")}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Deploying..." : "Publish & Go Live"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
