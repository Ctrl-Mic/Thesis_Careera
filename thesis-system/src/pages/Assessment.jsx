import { useState } from "react";
import { useNavigate } from "react-router-dom";

const questions = [
  {
    id: 1,
    question: "What type of work interests you most?",
    options: [
      "Software Development",
      "Data and Analytics",
      "Information Technology",
      "Business and Management",
    ],
  },
  {
    id: 2,
    question: "Which skill would you like to use in your future career?",
    options: [
      "Programming",
      "Problem Solving",
      "Communication",
      "Data Analysis",
    ],
  },
  {
    id: 3,
    question: "What environment would you prefer?",
    options: [
      "Technology Company",
      "Government",
      "Education",
      "Private Company",
    ],
  },
];

function Assessment() {
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});

  function handleAnswer(answer) {
    setAnswers({
      ...answers,
      [questions[currentQuestion].id]: answer,
    });
  }

  function handleNext() {
    if (!answers[questions[currentQuestion].id]) {
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Later, this data can be sent to your backend/API.
      console.log("Assessment answers:", answers);

      navigate("/home");
    }
  }

  const question = questions[currentQuestion];

  return (
    <div className="assessment-page">
      <div className="assessment-card">
        <p>
          Question {currentQuestion + 1} of {questions.length}
        </p>

        <h1>{question.question}</h1>

        <div className="options">
          {question.options.map((option) => (
            <button
              key={option}
              className={
                answers[question.id] === option
                  ? "option selected"
                  : "option"
              }
              onClick={() => handleAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>

        <button
          className="button full-width"
          onClick={handleNext}
          disabled={!answers[question.id]}
        >
          {currentQuestion === questions.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

export default Assessment;