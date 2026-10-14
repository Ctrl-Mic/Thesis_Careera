import { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar";

const proficiencyLevels = [
  { level: 0, label: "None / no experience" },
  { level: 1, label: "Beginner" },
  { level: 2, label: "Basic" },
  { level: 3, label: "Skilled" },
  { level: 4, label: "Advanced" },
  { level: 5, label: "Expert" },
];

async function readApiResponse(response, fallbackMessage) {
  const result = await response.json();
  if (!response.ok || result.success !== true) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
}

function Assessment() {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const token = window.localStorage.getItem("careerera_auth_token");

  useEffect(() => {
    let isMounted = true;

    async function loadAssessment() {
      try {
        const [questionResult, latestResult] = await Promise.all([
          fetch("/api/assessment/questions")
            .then((response) => readApiResponse(response, "Unable to load assessment questions.")),
          fetch("/api/assessment/latest", {
            headers: { Authorization: `Bearer ${token}` },
          }).then((response) => readApiResponse(response, "Unable to load your latest answers.")),
        ]);

        if (!isMounted) return;
        if (!Array.isArray(questionResult.questions)) {
          throw new Error("The assessment question list is invalid.");
        }
        setQuestions(questionResult.questions);
        setAnswers(Object.fromEntries(
          latestResult.answers.map(({ category, level }) => [category, level]),
        ));
        if (latestResult.attempt_id) {
          setNotice("Your latest saved answers have been loaded.");
        }
      } catch (loadError) {
        if (isMounted) setError(loadError.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAssessment();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const unansweredQuestions = useMemo(
    () => questions.filter(({ category }) => !Object.hasOwn(answers, category)),
    [answers, questions],
  );

  async function handleSubmit(event) {
    event.preventDefault();
    if (unansweredQuestions.length > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/assessment/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(questions.map(({ category }) => ({
          category,
          level: answers[category],
        }))),
      });
      await readApiResponse(response, "Unable to save your assessment.");
      setNotice("Your assessment answers have been saved.");
      setError("");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Navbar>
      <div className="dashboard-heading assessment-heading">
        <div>
          <p className="dashboard-eyebrow">CAREERA / CAREER ASSESSMENT</p>
          <h1>Tourism Skills Assessment</h1>
          <p className="dashboard-subtitle">
            Explore 18 skill areas and sample proficiency levels relevant to
            tourism careers.
          </p>
        </div>
        <span className="prototype-label">Answer all {questions.length || 18} categories</span>
      </div>

      {isLoading && <p role="status">Loading your assessment...</p>}
      {error && <p className="assessment-feedback assessment-error" role="alert">{error}</p>}
      {notice && <p className="assessment-feedback assessment-success" role="status">{notice}</p>}

      {!isLoading && !error && (
        <form onSubmit={handleSubmit}>
          <div className="assessment-question-list">
            {questions.map((item, index) => {
              const isUnanswered = !Object.hasOwn(answers, item.category);
              const anchorsByLevel = new Map(item.anchors.map(({ level, text }) => [level, text]));

              return (
                <section
                  className={`assessment-question-card${isUnanswered ? " assessment-question-unanswered" : ""}`}
                  key={item.category}
                >
                  <div className="assessment-question-heading">
                    <span className="assessment-question-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h2>{item.category}</h2>
                      <p>{item.question}</p>
                    </div>
                  </div>

                  <fieldset className="assessment-options">
                    <legend className="assessment-options-legend">
                      Select your proficiency level
                    </legend>
                    {proficiencyLevels.map(({ level, label }) => (
                      <label className="assessment-option" key={level}>
                        <input
                          type="radio"
                          name={`assessment-${index}`}
                          value={level}
                          checked={answers[item.category] === level}
                          onChange={() => {
                            setAnswers((currentAnswers) => ({
                              ...currentAnswers,
                              [item.category]: level,
                            }));
                            setNotice("");
                          }}
                        />
                        <span className="assessment-level">{level} · {label}</span>
                        {anchorsByLevel.has(level) && (
                          <span className="assessment-example-text">
                            {anchorsByLevel.get(level)}
                          </span>
                        )}
                      </label>
                    ))}
                  </fieldset>
                  {isUnanswered && (
                    <p className="assessment-missing-answer">Please select one level.</p>
                  )}
                </section>
              );
            })}
          </div>

          {unansweredQuestions.length > 0 && (
            <p className="assessment-feedback assessment-incomplete" role="status">
              Unanswered ({unansweredQuestions.length}):{" "}
              {unansweredQuestions.map(({ category }) => category).join(", ")}
            </p>
          )}
          <button
            className="assessment-submit"
            type="submit"
            disabled={isLoading || isSubmitting || unansweredQuestions.length > 0}
          >
            {isSubmitting ? "Saving..." : "Submit assessment"}
          </button>
        </form>
      )}
    </Navbar>
  );
}

export default Assessment;
