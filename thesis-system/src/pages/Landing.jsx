function Landing({ onNavigate }) {
  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="logo">
          CareerEra
        </div>

        <div className="nav-buttons">
          <button
            className="text-button"
            onClick={() => onNavigate("login")}
          >
            Login
          </button>

          <button
            className="primary-button"
            onClick={() => onNavigate("login")}
          >
            Get Started
          </button>
        </div>
      </nav>

      <main className="hero">
        <div className="hero-content">
          <p className="eyebrow">
            CAREER RECOMMENDATION SYSTEM
          </p>

          <h1>
            Navigate Your
            <span> Career Era.</span>
          </h1>

          <p className="hero-description">
            Discover career opportunities that match your
            skills, interests, and academic journey.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-button large-button"
              onClick={() => onNavigate("login")}
            >
              Get Started
            </button>

            <button
              className="secondary-button large-button"
              onClick={() => onNavigate("login")}
            >
              Login
            </button>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-header">
            <span>Career Match</span>
            <span className="status-dot"></span>
          </div>

          <h3>Junior Web Developer</h3>

          <p>ABC Technologies</p>

          <div className="skill-list">
            <span>JavaScript</span>
            <span>React</span>
            <span>HTML</span>
            <span>CSS</span>
          </div>

          <div className="match">
            <strong>85%</strong>
            <span>Skill Match</span>
          </div>
        </div>
      </main>

      <section className="features">
        <div className="feature">
          <div className="feature-number">01</div>
          <h3>Assess</h3>
          <p>
            Understand your current skills and interests.
          </p>
        </div>

        <div className="feature">
          <div className="feature-number">02</div>
          <h3>Match</h3>
          <p>
            Find opportunities related to your profile.
          </p>
        </div>

        <div className="feature">
          <div className="feature-number">03</div>
          <h3>Recommend</h3>
          <p>
            Explore careers and opportunities suited to you.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Landing;