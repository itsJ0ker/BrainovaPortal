"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { IExam, IQuestion, IQuestionOption, QuestionType } from "@/types";
import {
  STANDARD_SUBJECTS,
  STANDARD_CLASSES,
  STANDARD_STREAMS,
  STANDARD_SECTIONS,
  EXAM_DURATION_PRESETS,
  EXAM_TITLE_TEMPLATES,
  POINT_PRESETS,
  NEGATIVE_POINT_PRESETS,
} from "@/lib/constants";
import {
  toISTInputString,
  istInputToISO,
  formatInIST,
  getTomorrow9AMIST,
  addDaysToISTInput,
  IST_BADGE,
} from "@/lib/timezone";
import {
  Plus,
  Trash2,
  CheckCircle2,
  Shield,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Settings,
  AlertTriangle,
  Check,
  Calendar,
  Sparkles,
  Filter,
  GraduationCap,
  Users,
  X,
} from "lucide-react";

interface ExamFormProps {
  schoolSlug: string;
  initialData?: Partial<IExam>;
  classes: string[];
  subjects: string[];
}

export function ExamForm({ schoolSlug, initialData, classes, subjects }: ExamFormProps) {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Catalog merges
  const allSubjectOptions = useMemo(() => {
    const set = new Set([...subjects, ...STANDARD_SUBJECTS.map((s) => s.name)]);
    return Array.from(set);
  }, [subjects]);

  const allClassOptions = useMemo(() => {
    const set = new Set([...classes, ...STANDARD_CLASSES]);
    return Array.from(set);
  }, [classes]);

  // Step 1: Basics
  const initialSubject = initialData?.subject || subjects[0] || "Physics";
  const [subject, setSubject] = useState(initialSubject);
  const [isCustomSubject, setIsCustomSubject] = useState(
    !allSubjectOptions.includes(initialSubject)
  );
  const [customSubjectText, setCustomSubjectText] = useState(
    !allSubjectOptions.includes(initialSubject) ? initialSubject : ""
  );

  const initialClass = initialData?.classGrade || classes[0] || "Grade 10";
  const [classGrade, setClassGrade] = useState(initialClass);
  const [isCustomClass, setIsCustomClass] = useState(
    !allClassOptions.includes(initialClass)
  );
  const [customClassText, setCustomClassText] = useState(
    !allClassOptions.includes(initialClass) ? initialClass : ""
  );

  const finalSubject = isCustomSubject ? customSubjectText.trim() : subject;
  const finalClass = isCustomClass ? customClassText.trim() : classGrade;

  const [title, setTitle] = useState(initialData?.title || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(initialData?.config?.durationMinutes || 45);

  const defaultStart = toISTInputString(new Date());
  const defaultEnd = addDaysToISTInput(defaultStart, 7);

  const [startTime, setStartTime] = useState(
    initialData?.config?.startTime ? toISTInputString(initialData.config.startTime) : defaultStart
  );
  const [endTime, setEndTime] = useState(
    initialData?.config?.endTime ? toISTInputString(initialData.config.endTime) : defaultEnd
  );

  // Quick schedule window helpers in Indian Standard Time (Delhi · UTC+05:30)
  const setWindowDurationDays = (days: number) => {
    setEndTime(addDaysToISTInput(startTime, days));
  };

  const setWindowStartsNow = () => {
    const curStart = toISTInputString(new Date());
    setStartTime(curStart);
    setEndTime(addDaysToISTInput(curStart, 7));
  };

  const setWindowStartsTomorrow = () => {
    const { start, end3Days } = getTomorrow9AMIST();
    setStartTime(start);
    setEndTime(end3Days);
  };

  // Step 2: Targeting
  const initialTargetType =
    initialData?.targeting?.type === "all"
      ? "all"
      : initialData?.targeting?.type === "class_section"
      ? "class_section"
      : "assigned_class";

  const [targetType, setTargetType] = useState<"assigned_class" | "class_section" | "all">(
    initialTargetType
  );
  const [targetClasses, setTargetClasses] = useState<string[]>(
    initialData?.targeting?.classes && initialData.targeting.classes.length > 0
      ? initialData.targeting.classes
      : [initialClass]
  );
  const [targetSections, setTargetSections] = useState<string[]>(
    initialData?.targeting?.sections || []
  );

  // Auto-sync targetClasses when in assigned_class mode
  useEffect(() => {
    if (targetType === "assigned_class" && finalClass) {
      setTargetClasses([finalClass]);
    }
  }, [finalClass, targetType]);

  const handleSelectGrade = (cls: string) => {
    setIsCustomClass(false);
    setClassGrade(cls);
    setTargetClasses([cls]);
  };

  const handleCustomGradeChange = (val: string) => {
    setIsCustomClass(true);
    setCustomClassText(val);
    setTargetClasses(val.trim() ? [val.trim()] : []);
  };

  const toggleTargetClass = (cls: string) => {
    if (targetClasses.includes(cls)) {
      setTargetClasses(targetClasses.filter((c) => c !== cls));
    } else {
      setTargetClasses([...targetClasses, cls]);
    }
  };

  const toggleTargetSection = (sec: string) => {
    if (targetSections.includes(sec)) {
      setTargetSections(targetSections.filter((s) => s !== sec));
    } else {
      setTargetSections([...targetSections, sec]);
    }
  };

  const selectGroupClasses = (group: "all" | "high" | "middle" | "primary" | "clear") => {
    if (group === "all") {
      setTargetClasses([...allClassOptions]);
    } else if (group === "high") {
      setTargetClasses(["Grade 12", "Grade 11", "Grade 10", "Grade 9"]);
    } else if (group === "middle") {
      setTargetClasses(["Grade 8", "Grade 7", "Grade 6"]);
    } else if (group === "primary") {
      setTargetClasses(["Grade 5", "Grade 4", "Grade 3", "Grade 2", "Grade 1"]);
    } else if (group === "clear") {
      setTargetClasses([]);
    }
  };

  // Step 3: Questions
  const [questions, setQuestions] = useState<IQuestion[]>(
    initialData?.questions || [
      {
        id: "q_1",
        type: "single_choice",
        prompt: "What is the standard SI unit of electric current?",
        options: [
          { id: "opt_1", text: "Ampere (A)" },
          { id: "opt_2", text: "Volt (V)" },
          { id: "opt_3", text: "Ohm (Ω)" },
          { id: "opt_4", text: "Watt (W)" },
        ],
        correctAnswer: "opt_1",
        points: 4,
        negativePoints: 1,
        explanation: "Electric current is measured in Amperes (A).",
      },
    ]
  );

  // Step 4: Anti-Cheating & Integrity
  const [antiCheatingEnabled, setAntiCheatingEnabled] = useState(
    initialData?.config?.antiCheating?.enabled ?? true
  );
  const [maxViolations, setMaxViolations] = useState(
    initialData?.config?.antiCheating?.maxViolations || 3
  );
  const [actionOnThreshold, setActionOnThreshold] = useState<"auto_submit" | "warn_only" | "flag">(
    initialData?.config?.antiCheating?.actionOnThreshold || "auto_submit"
  );
  const [blockCopyPaste, setBlockCopyPaste] = useState(
    initialData?.config?.antiCheating?.blockCopyPaste ?? true
  );
  const [enforceFullscreen, setEnforceFullscreen] = useState(
    initialData?.config?.antiCheating?.enforceFullscreen ?? false
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    initialData?.config?.shuffleQuestions ?? false
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    initialData?.config?.shuffleOptions ?? false
  );

  // Step 5: Result Release
  const [resultReleaseMode, setResultReleaseMode] = useState<"immediate" | "manual" | "scheduled">(
    initialData?.config?.resultReleaseMode || "manual"
  );

  // Add Question Helper
  const addQuestion = (type: QuestionType) => {
    const newId = `q_${Date.now()}`;
    if (type === "single_choice" || type === "multiple_choice") {
      setQuestions([
        ...questions,
        {
          id: newId,
          type,
          prompt: "Enter question statement here...",
          options: [
            { id: "opt_a", text: "Option A" },
            { id: "opt_b", text: "Option B" },
            { id: "opt_c", text: "Option C" },
            { id: "opt_d", text: "Option D" },
          ],
          correctAnswer: type === "single_choice" ? "opt_a" : ["opt_a"],
          points: 4,
          negativePoints: 1,
        },
      ]);
    } else if (type === "true_false") {
      setQuestions([
        ...questions,
        {
          id: newId,
          type: "true_false",
          prompt: "Enter statement to verify (True or False)...",
          options: [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ],
          correctAnswer: "true",
          points: 2,
          negativePoints: 0,
        },
      ]);
    } else if (type === "written") {
      setQuestions([
        ...questions,
        {
          id: newId,
          type: "written",
          prompt: "Enter subjective question prompt or problem description...",
          points: 10,
          negativePoints: 0,
          rubric: "Full marks for complete step-by-step derivation and final unit.",
        },
      ]);
    }
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const updateQuestion = (id: string, updates: Partial<IQuestion>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const addOptionToQuestion = (qId: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId || !q.options) return q;
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
    setQuestions(
      questions.map((q) => {
        if (q.id !== qId || !q.options || q.options.length <= 2) return q;
        const newOpts = q.options.filter((o) => o.id !== optId);
        let newCorrect = q.correctAnswer;
        if (Array.isArray(q.correctAnswer)) {
          newCorrect = q.correctAnswer.filter((c) => c !== optId);
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

  const handleSaveExam = async (status: "draft" | "published") => {
    const finalSubject = isCustomSubject ? customSubjectText.trim() : subject;
    const finalClass = isCustomClass ? customClassText.trim() : classGrade;

    if (!title.trim() || !finalSubject) {
      setError("Exam title and subject are required.");
      setStep(1);
      return;
    }

    if (questions.length === 0) {
      setError("Please add at least one question to the exam.");
      setStep(3);
      return;
    }

    setIsSubmitting(true);
    setError("");

    const payload = {
      title: title.trim(),
      subject: finalSubject,
      classGrade: finalClass,
      description,
      targeting: {
        type: targetType,
        classes:
          targetType === "all"
            ? []
            : targetType === "assigned_class"
            ? (finalClass ? [finalClass] : [])
            : targetClasses.length > 0
            ? targetClasses
            : (finalClass ? [finalClass] : []),
        streams: [],
        sections: targetSections,
      },
      questions,
      config: {
        durationMinutes: Number(durationMinutes),
        startTime: istInputToISO(startTime),
        endTime: istInputToISO(endTime),
        attemptLimit: 1,
        shuffleQuestions,
        shuffleOptions,
        verificationMode: "roll_or_admission",
        resultReleaseMode,
        antiCheating: {
          enabled: antiCheatingEnabled,
          maxViolations: Number(maxViolations),
          actionOnThreshold,
          blockCopyPaste,
          enforceFullscreen,
          detectTabSwitch: true,
          preventContextMenu: true,
        },
      },
      status,
    };

    try {
      const url = initialData?._id
        ? `/api/school/${schoolSlug}/exams/${initialData._id}`
        : `/api/school/${schoolSlug}/exams`;

      const method = initialData?._id ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to save examination.");
        return;
      }

      router.push(`/school/${schoolSlug}/exams`);
    } catch (err: any) {
      setError(err.message || "Network error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: "Overview & Schedule" },
    { num: 2, title: "Eligibility Targeting" },
    { num: 3, title: `Questions (${questions.length})` },
    { num: 4, title: "Anti-Cheating" },
    { num: 5, title: "Review & Publish" },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 overflow-x-auto gap-2">
        {stepsList.map((st) => (
          <button
            key={st.num}
            type="button"
            onClick={() => setStep(st.num)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              step === st.num
                ? "bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600/30"
                : step > st.num
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                step === st.num
                  ? "bg-white text-indigo-600"
                  : step > st.num
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {step > st.num ? "✓" : st.num}
            </span>
            <span>{st.title}</span>
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Step 1: Exam Identity & Schedule
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select standard subject curriculum, primary target cohort, and configure test window in Indian Standard Time (Delhi).
            </p>
          </div>

          {/* Examination Title with Quick Preset Chips */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Examination Title</label>
              <span className="text-[11px] text-slate-400">Quick templates:</span>
            </div>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Physics: Kinematics & Modern Optics"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none transition-all shadow-sm"
            />
            {/* Title templates */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {EXAM_TITLE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl}
                  type="button"
                  onClick={() => {
                    const currentSub = isCustomSubject ? customSubjectText : subject;
                    setTitle(`${currentSub} ${tmpl}`);
                  }}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition-colors"
                >
                  + {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Subject Selector */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Subject</label>
                <span className="text-[11px] text-indigo-600 font-medium">Select catalog</span>
              </div>
              <select
                value={isCustomSubject ? "__custom__" : subject}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomSubject(true);
                  } else {
                    setIsCustomSubject(false);
                    setSubject(e.target.value);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none shadow-sm"
              >
                <optgroup label="School Curriculum & Standard Subjects">
                  {allSubjectOptions.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </optgroup>
                <option value="__custom__">+ Custom / Other Subject...</option>
              </select>

              {isCustomSubject && (
                <input
                  type="text"
                  value={customSubjectText}
                  onChange={(e) => setCustomSubjectText(e.target.value)}
                  placeholder="Enter custom subject name..."
                  className="mt-2 w-full rounded-xl border border-indigo-500 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              )}
            </div>

            {/* Primary Class Selector */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700">Primary Class / Level</label>
                <span className="text-[11px] text-indigo-600 font-medium">Select grade</span>
              </div>
              <select
                value={isCustomClass ? "__custom__" : classGrade}
                onChange={(e) => {
                  if (e.target.value === "__custom__") {
                    setIsCustomClass(true);
                  } else {
                    setIsCustomClass(false);
                    setClassGrade(e.target.value);
                  }
                }}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus:outline-none shadow-sm"
              >
                <optgroup label="Standard Grades">
                  {allClassOptions.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </optgroup>
                <option value="__custom__">+ Custom / Other Class...</option>
              </select>

              {isCustomClass && (
                <input
                  type="text"
                  value={customClassText}
                  onChange={(e) => setCustomClassText(e.target.value)}
                  placeholder="Enter custom class (e.g. Foundation Batch)..."
                  className="mt-2 w-full rounded-xl border border-indigo-500 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Exam Duration with Preset Selector Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Examination Duration: <span className="text-indigo-600 font-bold">{durationMinutes} Minutes</span>
              </label>
              <span className="text-[11px] text-slate-400">Quick select preset:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAM_DURATION_PRESETS.map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDurationMinutes(dur)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    durationMinutes === dur
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                      : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {dur} mins {durationMinutes === dur && "✓"}
                </button>
              ))}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-[11px] text-slate-500">Custom:</span>
                <input
                  type="number"
                  min="5"
                  max="360"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-18 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900 text-center focus:border-indigo-600 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500">m</span>
              </div>
            </div>
          </div>

          {/* Testing Window Scheduling with Fast Presets (Indian Timezone · Delhi) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  Testing Window Schedule
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 border border-emerald-200 text-emerald-800">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {IST_BADGE}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={setWindowStartsNow}
                  className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                  title="Open schedule immediately in Indian Standard Time (Delhi)"
                >
                  ⚡ Start Now
                </button>
                <button
                  type="button"
                  onClick={setWindowStartsTomorrow}
                  className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                  title="Open schedule tomorrow 9:00 AM IST"
                >
                  Tomorrow 9 AM
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <span className="text-[10px] text-slate-500">Duration:</span>
                {[1, 3, 7, 14].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setWindowDurationDays(days)}
                    className="rounded-md bg-white border border-slate-200 hover:bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700 transition-colors"
                  >
                    {days === 1 ? "24h" : `${days}d`}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Testing Window Opens
                    <span className="text-[10px] font-normal text-indigo-600">(Delhi Time)</span>
                  </label>
                </div>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                />
                <p className="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 pt-0.5">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>{formatInIST(startTime) || "Select opening time"}</span>
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Testing Window Closes
                    <span className="text-[10px] font-normal text-indigo-600">(Delhi Time)</span>
                  </label>
                </div>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                />
                <p className="text-[11px] text-emerald-700 font-mono flex items-center gap-1.5 pt-0.5">
                  <Clock className="w-3 h-3 text-emerald-600" />
                  <span>{formatInIST(endTime) || "Select closing time"}</span>
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-white border border-slate-200 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 shadow-2xs">
              <div className="flex items-center gap-1.5">
                <span className="text-xs">🇮🇳</span>
                <span>Scheduled in <strong>Indian Standard Time (IST)</strong> · Asia/Kolkata (UTC+05:30).</span>
              </div>
              <div className="text-slate-500 font-medium text-[10px]">
                Delhi Time
              </div>
            </div>
          </div>

          {/* Description & Candidate Instructions */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Candidate Instructions</label>
              <span className="text-[11px] text-slate-400">Insert preset snippet:</span>
            </div>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide instructions to candidates regarding calculators, time limits, or allowed materials."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                "No external calculators or devices allowed.",
                "Ensure a stable internet connection before beginning.",
                "Fullscreen integrity monitor is active during this exam.",
                "Single attempt only. Time begins once started.",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setDescription((prev) => (prev ? `${prev} ${chip}` : chip));
                  }}
                  className="rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700 transition-colors"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Targeting */}
      {step === 2 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Step 2: Candidate Targeting & Class Eligibility
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Control which students can take this test. Restrict access to a specific grade, multiple classes, or allow all students.
            </p>
          </div>

          {/* 3 Targeting Mode Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Mode 1: Select Grade */}
            <button
              type="button"
              onClick={() => {
                setTargetType("assigned_class");
                if (finalClass) setTargetClasses([finalClass]);
              }}
              className={`p-4 rounded-xl border text-left transition-all relative ${
                targetType === "assigned_class"
                  ? "border-emerald-500 bg-emerald-50/60 text-slate-900 ring-2 ring-emerald-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className={`w-4 h-4 ${targetType === "assigned_class" ? "text-emerald-600" : "text-slate-400"}`} />
                    <span className="font-bold text-sm text-slate-900">Select Grade</span>
                  </div>
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {finalClass || "Select Grade"}
                  </span>
                </div>
                {targetType === "assigned_class" && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2.5">
                Strictly restrict access to candidates registered in <strong className="text-slate-900">{finalClass || "this grade"}</strong>. Students from other grades are blocked.
              </p>
            </button>

            {/* Mode 2: Multiple Specific Classes */}
            <button
              type="button"
              onClick={() => {
                setTargetType("class_section");
                if (targetClasses.length === 0 && finalClass) {
                  setTargetClasses([finalClass]);
                }
              }}
              className={`p-4 rounded-xl border text-left transition-all ${
                targetType === "class_section"
                  ? "border-indigo-500 bg-indigo-50/60 text-slate-900 ring-2 ring-indigo-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Filter className={`w-4 h-4 ${targetType === "class_section" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="font-bold text-sm text-slate-900">Multiple Classes</span>
                </div>
                {targetType === "class_section" && <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2.5">
                Allow candidates from specific multiple grade cohorts (e.g. Grade 9 & Grade 10) to attempt this test.
              </p>
            </button>

            {/* Mode 3: All Registered Students */}
            <button
              type="button"
              onClick={() => setTargetType("all")}
              className={`p-4 rounded-xl border text-left transition-all ${
                targetType === "all"
                  ? "border-sky-500 bg-sky-50/60 text-slate-900 ring-2 ring-sky-500/20 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className={`w-4 h-4 ${targetType === "all" ? "text-sky-600" : "text-slate-400"}`} />
                  <span className="font-bold text-sm text-slate-900">All Students</span>
                </div>
                {targetType === "all" && <Check className="w-4 h-4 text-sky-600 flex-shrink-0" />}
              </div>
              <p className="text-xs text-slate-500 mt-2.5">
                Open to all active registered candidates across all cohorts in this institution without grade barriers.
              </p>
            </button>
          </div>

          {/* Mode 1: Select Grade Active Panel with direct grade picker */}
          {targetType === "assigned_class" && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">
                      Eligible Grade: <span className="text-emerald-700 text-sm font-extrabold">{finalClass || "None Selected"}</span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Candidates registered in <strong className="text-emerald-700">{finalClass || "this grade"}</strong> will be eligible to attempt this exam.
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 self-start sm:self-auto flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Enforced by Gatekeeper
                </span>
              </div>

              {/* Direct Grade Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Choose Target Grade:
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Click a grade pill or select custom
                  </span>
                </div>

                {/* Grade Quick Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {allClassOptions.map((cls) => {
                    const isSelected = !isCustomClass && classGrade === cls;
                    return (
                      <button
                        key={cls}
                        type="button"
                        onClick={() => handleSelectGrade(cls)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-100 text-emerald-950 ring-1 ring-emerald-500/40 font-bold shadow-2xs"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <span>{cls}</span>
                        <span
                          className={`flex h-4 w-4 items-center justify-center rounded-md text-[10px] ${
                            isSelected
                              ? "bg-emerald-600 text-white font-bold"
                              : "border border-slate-300 bg-slate-100"
                          }`}
                        >
                          {isSelected ? "✓" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown / Custom Class option */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-center gap-3">
                  <div className="w-full sm:w-auto text-xs text-slate-600 font-medium whitespace-nowrap">
                    Other Grade / Custom:
                  </div>
                  <div className="w-full flex-1 flex flex-col sm:flex-row gap-2">
                    <select
                      value={isCustomClass ? "__custom__" : classGrade}
                      onChange={(e) => {
                        if (e.target.value === "__custom__") {
                          setIsCustomClass(true);
                        } else {
                          handleSelectGrade(e.target.value);
                        }
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-600 focus:outline-none"
                    >
                      <optgroup label="Standard Grades">
                        {allClassOptions.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </optgroup>
                      <option value="__custom__">+ Custom / Special Batch...</option>
                    </select>

                    {isCustomClass && (
                      <input
                        type="text"
                        value={customClassText}
                        onChange={(e) => handleCustomGradeChange(e.target.value)}
                        placeholder="Enter custom grade (e.g. Foundation Batch)..."
                        className="flex-1 rounded-xl border border-emerald-500 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none"
                        autoFocus
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Multi-Class Selector */}
          {targetType === "class_section" && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div>
                  <label className="text-xs font-bold text-slate-800">
                    Eligible Classes ({targetClasses.length} Selected)
                  </label>
                  <p className="text-[11px] text-slate-500">Click pills to select/deselect cohorts</p>
                </div>

                {/* Group selector shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400">Presets:</span>
                  <button
                    type="button"
                    onClick={() => selectGroupClasses("all")}
                    className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGroupClasses("high")}
                    className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    High School (9-12)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGroupClasses("middle")}
                    className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Middle (6-8)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGroupClasses("primary")}
                    className="rounded-lg bg-white border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                  >
                    Primary (1-5)
                  </button>
                  <button
                    type="button"
                    onClick={() => selectGroupClasses("clear")}
                    className="rounded-lg bg-rose-50 border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-700 hover:bg-rose-100"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Multi-select class pills */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {allClassOptions.map((cls) => {
                  const isSelected = targetClasses.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleTargetClass(cls)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500/30 font-bold shadow-2xs"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span>{cls}</span>
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-md text-[10px] ${
                          isSelected ? "bg-indigo-600 text-white" : "border border-slate-300 bg-slate-100"
                        }`}
                      >
                        {isSelected ? "✓" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Section Filter */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800">
                  Section Restriction (Optional)
                </label>
                <p className="text-[11px] text-slate-500">
                  {targetSections.length === 0
                    ? "Open to all sections of eligible classes"
                    : `Restricted to Section${targetSections.length > 1 ? "s" : ""} ${targetSections.join(", ")}`}
                </p>
              </div>
              {targetSections.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTargetSections([])}
                  className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold"
                >
                  Reset (Allow All Sections)
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setTargetSections([])}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                  targetSections.length === 0
                    ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500/30 font-semibold"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                All Sections
              </button>
              {STANDARD_SECTIONS.map((sec) => {
                const isSelected = targetSections.includes(sec);
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => toggleTargetSection(sec)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-500/30 font-semibold"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    Section {sec}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Questions */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Step 3: Question Builder ({questions.length} Items)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Total Exam Points:{" "}
                <span className="font-bold text-emerald-700">
                  {questions.reduce((sum, q) => sum + (q.points || 0), 0)} Marks
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addQuestion("single_choice")}
                className="rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-2xs"
              >
                + MCQ Single
              </button>
              <button
                type="button"
                onClick={() => addQuestion("multiple_choice")}
                className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors shadow-2xs"
              >
                + MCQ Multi
              </button>
              <button
                type="button"
                onClick={() => addQuestion("true_false")}
                className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors shadow-2xs"
              >
                + True / False
              </button>
              <button
                type="button"
                onClick={() => addQuestion("written")}
                className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors shadow-2xs"
              >
                + Written / Subjective
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm"
              >
                {/* Question Header & Point Preset Selectors */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {q.type.replace("_", " ")}
                    </span>
                  </div>

                  {/* Selective Points & Negative Marking */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Points Selection */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-medium">Points:</span>
                      <div className="flex items-center gap-1">
                        {POINT_PRESETS.map((pts) => (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => updateQuestion(q.id, { points: pts })}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
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
                          onChange={(e) => updateQuestion(q.id, { points: Number(e.target.value) })}
                          className="w-12 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-center text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Negative Points Selection */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="text-slate-500 font-medium">Negative:</span>
                      <div className="flex items-center gap-1">
                        {NEGATIVE_POINT_PRESETS.map((npts) => (
                          <button
                            key={npts}
                            type="button"
                            onClick={() => updateQuestion(q.id, { negativePoints: npts })}
                            className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold border transition-colors ${
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

                    <button
                      type="button"
                      onClick={() => removeQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors ml-auto lg:ml-0"
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
                    placeholder="Enter question statement or formula..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* TRUE / FALSE: Visual Direct Selector Cards (Zero Typing) */}
                {q.type === "true_false" && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-slate-600">
                      Select Correct Answer (Click card to set answer key):
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, { correctAnswer: "true" })}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-bold transition-all ${
                          q.correctAnswer === "true"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>TRUE</span>
                        </div>
                        {q.correctAnswer === "true" && (
                          <span className="text-[10px] uppercase tracking-wider bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                            Correct Answer
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => updateQuestion(q.id, { correctAnswer: "false" })}
                        className={`flex items-center justify-between p-3.5 rounded-xl border text-sm font-bold transition-all ${
                          q.correctAnswer === "false"
                            ? "border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20"
                            : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <X className="w-4 h-4 text-rose-600" />
                          <span>FALSE</span>
                        </div>
                        {q.correctAnswer === "false" && (
                          <span className="text-[10px] uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded-md font-bold">
                            Correct Answer
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* MCQ Options with Add/Remove option controls */}
                {(q.type === "single_choice" || q.type === "multiple_choice") && q.options && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-600">
                        Answer Options (Select the correct radio/checkbox):
                      </p>
                      <button
                        type="button"
                        onClick={() => addOptionToQuestion(q.id)}
                        disabled={(q.options?.length || 0) >= 6}
                        className="rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] text-indigo-700 font-medium disabled:opacity-40 transition-colors"
                      >
                        + Add Choice ({q.options.length}/6)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect =
                          Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.includes(opt.id)
                            : q.correctAnswer === opt.id;
                        const optionLetter = String.fromCharCode(65 + optIdx);

                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs transition-all ${
                              isCorrect
                                ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500/30 font-medium"
                                : "border-slate-200 bg-slate-50 text-slate-800"
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

                            <span className="font-bold text-slate-400 font-mono text-xs">
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
                              className="bg-transparent border-none flex-1 text-xs text-slate-900 focus:outline-none"
                              placeholder={`Option ${optionLetter} text...`}
                            />

                            {q.options && q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOptionFromQuestion(q.id, opt.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Remove choice"
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

                {/* Written Rubric with Preset Chips */}
                {q.type === "written" && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-slate-600">
                        Grading Rubric / Answer Key (Visible only to teachers):
                      </label>
                      <span className="text-[11px] text-slate-400">Preset criteria:</span>
                    </div>
                    <textarea
                      rows={2}
                      value={q.rubric || ""}
                      onChange={(e) => updateQuestion(q.id, { rubric: e.target.value })}
                      placeholder="Outline criteria for awarding full vs partial marks during manual grading..."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none shadow-2xs"
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
                          className="rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 text-[10px] text-slate-700"
                        >
                          {rub}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Anti-Cheating & Integrity */}
      {step === 4 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <span>Step 4: Anti-Cheating & Exam Integrity Controls</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select proctoring strictness, warning thresholds, and security enforcement policies.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={antiCheatingEnabled}
                onChange={(e) => setAntiCheatingEnabled(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900">Enable Real-Time Anti-Cheating Engine</span>
                <p className="text-[11px] text-slate-500">
                  Tracks tab switches, focus loss, fullscreen exits, and logs an integrity audit trail.
                </p>
              </div>
            </label>

            {antiCheatingEnabled && (
              <div className="pl-7 space-y-4 pt-3 border-t border-slate-200">
                {/* Max Warnings Preset Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Max Warnings Allowed: <span className="text-indigo-600 font-bold">{maxViolations}</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Select strictness:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: 1, label: "1 (Strict)" },
                      { val: 3, label: "3 (Recommended)" },
                      { val: 5, label: "5 (Lenient)" },
                      { val: 10, label: "10 (Practice Mode)" },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setMaxViolations(item.val)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          maxViolations === item.val
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action on threshold selector cards */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-2">
                    Action on Warning Threshold Exceeded
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        val: "auto_submit",
                        title: "Auto-Submit Attempt",
                        desc: "Immediately locks and submits candidate exam paper with recorded violations.",
                      },
                      {
                        val: "warn_only",
                        title: "Warning Only",
                        desc: "Records violation log in scorecard for review without kicking out candidate.",
                      },
                      {
                        val: "flag",
                        title: "Flag for Review",
                        desc: "Allows exam to continue but badges scorecard as 'Integrity Flagged'.",
                      },
                    ].map((act) => (
                      <button
                        key={act.val}
                        type="button"
                        onClick={() => setActionOnThreshold(act.val as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          actionOnThreshold === act.val
                            ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/40"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="font-bold text-xs text-slate-900 flex items-center justify-between">
                          <span>{act.title}</span>
                          {actionOnThreshold === act.val && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">{act.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Security Feature Checkboxes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={blockCopyPaste}
                      onChange={(e) => setBlockCopyPaste(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Block Clipboard Copy / Paste & Text Selection</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={enforceFullscreen}
                      onChange={(e) => setEnforceFullscreen(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Enforce Fullscreen Mode During Test Session</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Randomize Question Order per Student Attempt</span>
                  </label>

                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={shuffleOptions}
                      onChange={(e) => setShuffleOptions(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                    />
                    <span>Randomize MCQ Option Choices per Student Attempt</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 5: Review & Publish */}
      {step === 5 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Step 5: Result Release Policy & Publication
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select when candidate scores and answer keys become visible.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700">Scorecard Release Setting</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "manual",
                  title: "Manual Release",
                  desc: "Scores kept hidden until school administrator clicks 'Publish Results'.",
                },
                {
                  id: "immediate",
                  title: "Immediate Release",
                  desc: "Candidates see their auto-graded score immediately upon exam submission.",
                },
                {
                  id: "scheduled",
                  title: "Scheduled Release",
                  desc: "Results automatically become visible after testing window closes.",
                },
              ].map((policy) => (
                <button
                  key={policy.id}
                  type="button"
                  onClick={() => setResultReleaseMode(policy.id as any)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    resultReleaseMode === policy.id
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/40"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{policy.title}</span>
                    {resultReleaseMode === policy.id && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{policy.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
            <h4 className="font-bold text-slate-900">Pre-Flight Examination Summary:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-700 pt-1">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Title</span>
                <span className="font-bold text-slate-900 truncate block">{title || "Untitled"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Subject & Class</span>
                <span className="font-bold text-slate-900 truncate block">
                  {isCustomSubject ? customSubjectText : subject} (
                  {isCustomClass ? customClassText : classGrade})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Questions & Marks</span>
                <span className="font-bold text-slate-900">
                  {questions.length} Items ({questions.reduce((s, q) => s + (q.points || 0), 0)} Marks)
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">Anti-Cheating</span>
                <span className="font-bold text-emerald-700">
                  {antiCheatingEnabled ? `Active (Max ${maxViolations})` : "Off"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                Schedule: {formatInIST(startTime)} – {formatInIST(endTime)}
              </span>
              <span className="text-emerald-700 font-mono text-[10px] font-semibold">
                IST · Delhi Time (UTC+05:30)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons between steps */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-sm transition-colors"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveExam("draft")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-2xs"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveExam("published")}
                className="rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? "Saving..." : "Publish Examination"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
