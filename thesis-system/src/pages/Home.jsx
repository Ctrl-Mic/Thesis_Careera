import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="page">
      <nav className="navbar">
        <h2>Thesis System</h2>

        <div className="nav-links">
          <Link to="/">Logout</Link>
        </div>
      </nav>

      <main className="home">
        <h1>Welcome, Student!</h1>

        <p>
          This is your career guidance dashboard.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Career Recommendations</h2>

            <p>
              View career opportunities based on your profile and assessment.
            </p>

            <button className="button">
              View Careers
            </button>
          </div>

          <div className="dashboard-card">
            <h2>Practicum Opportunities</h2>

            <p>
              Explore available practicum and internship opportunities.
            </p>

            <button className="button">
              View Opportunities
            </button>
          </div>

          <div className="dashboard-card">
            <h2>Skills</h2>

            <p>
              Review your skills and identify areas that may need improvement.
            </p>

            <button className="button">
              View Skills
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;