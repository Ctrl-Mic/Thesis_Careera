import { useMemo, useState } from "react";
import BrandWordmark from "../components/BrandWordmark";

const statusQuestion = {
  id: "status",
  prompt: "Which best describes your current status?",
  type: "single",
  choices: [
    { label: "Undergoing practicum", value: "UNDERGOING_PRACTICUM" },
    { label: "Graduating", value: "GRADUATING" },
  ],
};

const practicumQuestions = [
  {
    id: "practicum-status",
    prompt: "What is your practicum status?",
    type: "single",
    choices: [
      "Haven't started looking",
      "Currently looking for a placement",
      "Placement secured, not yet started",
      "Currently completing practicum",
      "Practicum completed",
    ],
  },
  {
    id: "practicum-factors",
    prompt: "What factors do you consider when choosing a practicum partner?",
    type: "multiple",
    maxSelections: 3,
    choices: [
      "Location",
      "Industry/Company Type",
      "Skills to be developed",
      "Career interest",
      "Company reputation",
      "Allowance/Benefits",
    ],
  },
  {
    id: "practicum-hours",
    prompt: "What is your practicum's minimum required rendered time?",
    type: "single",
    choices: [
      "Less than 200 hours",
      "200 to 300 hours",
      "300 to 400 hours",
      "400 to 500 hours",
      "Above 500 hours",
    ],
  },
];

const employmentQuestions = [
  {
    id: "employment-status",
    prompt: "What is your current employment status?",
    type: "single",
    choices: [
      "Not currently employed",
      "Employed full-time",
      "Employed part-time",
      "Freelancing/Self-employed",
      "Pursuing further studies",
    ],
  },
  {
    id: "job-type",
    prompt: "What type of job are you looking for?",
    type: "single",
    choices: [
      "Full time",
      "Part time",
      "Freelance",
      "Contract",
      "Internship/Apprenticeship",
      "Open to any opportunity",
    ],
  },
  {
    id: "expected-salary",
    prompt: "Expected Salary",
    type: "single",
    choices: [
      "Below 15,000 per month",
      "15,000 to 20,000 per month",
      "20,000 to 30,000 per month",
      "30,000 to 40,000 per month",
      "40,000 to 50,000 per month",
      "Above 50,000 per month",
      "No specific preference",
    ],
  },
];

const sharedQuestions = [
  {
    id: "degree",
    prompt: "What is your current degree/program?",
    type: "single",
    choices: [
      "Bachelor of Science in Computer Science",
      "Bachelor of Science in Information Technology",
      "Bachelor of Science in Tourism Management",
      "Bachelor of Science in Hospitality Management",
      "Bachelor of Science in Entrepreneurship",
      "Bachelor of Technology and Livelihood Education",
      "Bachelor of Early Childhood Education",
      "Bachelor of Science in Office Administration",
    ],
  },
  {
    id: "work-setup",
    prompt: "Choose your preferred work setup.",
    type: "single",
    choices: ["Onsite", "Hybrid", "Work-from-Home", "Flexible/No Preference"],
  },
  {
    id: "location",
    prompt: "Choose your preferred location.",
    type: "single",
    choices: [
      "Within my current city",
      "Anywhere in my region",
      "Anywhere in the Philippines",
      "Metro Manila",
      "Willing to relocate",
      "Remote only",
    ],
  },
];

const branchAnswerIds = [
  "practicum-status",
  "practicum-factors",
  "practicum-hours",
  "employment-status",
  "job-type",
  "expected-salary",
];

function getQuestions(answers) {
  let branchQuestions = [];

  if (answers.status === "UNDERGOING_PRACTICUM") {
    branchQuestions = practicumQuestions.filter(
      ({ id }) => id !== "practicum-hours" || answers["practicum-status"] !== "Practicum completed",
    );
  } else {
    branchQuestions = employmentQuestions;
  }

  return [statusQuestion, ...branchQuestions, ...sharedQuestions];
}

function getChoiceValue(choice) {
  return typeof choice === "string" ? choice : choice.value;
}

function PreAssessment() {
  const [answers, setAnswers] = useState({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const questions = useMemo(() => getQuestions(answers), [answers]);
  const currentQuestion = questions[questionIndex];
  const progress = isComplete ? 100 : ((questionIndex + 1) / questions.length) * 100;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const hasAnswer = Array.isArray(currentAnswer)
    ? currentAnswer.length > 0
    : currentAnswer !== undefined;

  function handleChoiceChange(question, value) {
    setAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };

      if (question.type === "multiple") {
        const selected = currentAnswers[question.id] ?? [];
        nextAnswers[question.id] = selected.includes(value)
          ? selected.filter((item) => item !== value)
          : [...selected, value];
        return nextAnswers;
      }

      nextAnswers[question.id] = value;

      if (question.id === "status" && currentAnswers.status !== value) {
        branchAnswerIds.forEach((id) => delete nextAnswers[id]);
      }
      if (question.id === "practicum-status" && value === "Practicum completed") {
        delete nextAnswers["practicum-hours"];
      }

      return nextAnswers;
    });
  }

  function handleNext() {
    if (!hasAnswer) return;

    if (questionIndex === questions.length - 1) {
      setIsComplete(true);
      return;
    }

    setQuestionIndex((index) => index + 1);
  }

  function handleBack() {
    if (questionIndex > 0) setQuestionIndex((index) => index - 1);
  }

  function handleRestart() {
    setAnswers({});
    setQuestionIndex(0);
    setIsComplete(false);
  }

  return (
    <main className="pre-assessment-page">
      <div className="pre-assessment-shell">
        <header className="pre-assessment-header">
          <BrandWordmark />
          {!isComplete && (
            <span className="pre-assessment-count">
              Question {questionIndex + 1} of {questions.length}
            </span>
          )}
        </header>

        {!isComplete && (
          <div
            className="pre-assessment-progress"
            role="progressbar"
            aria-label="Pre-assessment progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <span style={{ width: `${progress}%` }} />
          </div>
        )}

        {isComplete ? (
          <section className="pre-assessment-complete" aria-live="polite">
            <h1>Pre-assessment complete</h1>
            <p>Your answers are ready. They have not been saved.</p>
            <button type="button" className="pre-assessment-next" onClick={handleRestart}>
              Start over <span aria-hidden="true">›</span>
            </button>
          </section>
        ) : (
          <>
            <section className="pre-assessment-question" aria-labelledby="pre-assessment-prompt">
              <h1 id="pre-assessment-prompt">{currentQuestion.prompt}</h1>
              <fieldset
                className={`pre-assessment-options${currentQuestion.type === "multiple" ? " is-multiple" : ""}`}
                aria-labelledby="pre-assessment-prompt"
              >
                <legend className="sr-only">{currentQuestion.prompt}</legend>
                {currentQuestion.choices.map((choice) => {
                  const value = getChoiceValue(choice);
                  const selected = currentQuestion.type === "multiple"
                    ? (currentAnswer ?? []).includes(value)
                    : currentAnswer === value;
                  const atSelectionLimit = currentQuestion.type === "multiple"
                    && (currentAnswer ?? []).length >= currentQuestion.maxSelections
                    && !selected;

                  return (
                    <label
                      className={`pre-assessment-option${selected ? " is-selected" : ""}${atSelectionLimit ? " is-disabled" : ""}`}
                      key={value}
                    >
                      <span>{typeof choice === "string" ? choice : choice.label}</span>
                      <input
                        type={currentQuestion.type === "multiple" ? "checkbox" : "radio"}
                        name={currentQuestion.id}
                        value={value}
                        checked={selected}
                        disabled={atSelectionLimit}
                        onChange={() => handleChoiceChange(currentQuestion, value)}
                      />
                    </label>
                  );
                })}
              </fieldset>
              {currentQuestion.type === "multiple"
                && (currentAnswer ?? []).length >= currentQuestion.maxSelections && (
                  <p className="pre-assessment-hint">Select up to 3</p>
                )}
            </section>

            <footer className="pre-assessment-actions">
              {questionIndex > 0 ? (
                <button
                  type="button"
                  className="pre-assessment-back"
                  onClick={handleBack}
                >
                  <span aria-hidden="true">‹</span> Back
                </button>
              ) : <span />}
              <button
                type="button"
                className="pre-assessment-next"
                onClick={handleNext}
                disabled={!hasAnswer}
              >
                {questionIndex === questions.length - 1 ? "Finish" : "Next"}
                <span aria-hidden="true">›</span>
              </button>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

export default PreAssessment;