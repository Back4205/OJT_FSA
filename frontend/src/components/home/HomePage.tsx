import { Link } from "react-router-dom";
import styles from "./HomePage.module.css";

const featureCards = [
  {
    icon: "bi-kanban",
    title: "Task Management",
    text: "Create, assign, and organize tasks with detailed descriptions, attachments, and subtasks.",
  },
  {
    icon: "bi-view-list",
    title: "Kanban Board",
    text: "Visualize your workflow and drag-and-drop tasks across customizable stages.",
  },
  {
    icon: "bi-layers",
    title: "Project Management",
    text: "Group tasks into projects, track overall progress, and manage multiple initiatives.",
  },
  {
    icon: "bi-people",
    title: "Team Collaboration",
    text: "Comment on tasks, mention teammates, and keep everyone aligned in real time.",
  },
  {
    icon: "bi-calendar2-week",
    title: "Calendar & Deadlines",
    text: "Never miss a due date with integrated calendars and automated reminder notifications.",
  },
  {
    icon: "bi-graph-up-arrow",
    title: "Progress Tracking",
    text: "Generate beautiful reports, burndown charts, and track your team's velocity.",
  },
];

const steps = [
  {
    number: "1",
    title: "Create a Project",
    text: "Set up a workspace, invite your team, and define your project goals and milestones.",
  },
  {
    number: "2",
    title: "Assign Tasks",
    text: "Break down work into actionable tasks, assign owners, and set clear deadlines.",
  },
  {
    number: "3",
    title: "Track Progress",
    text: "Watch your project move forward via Kanban boards, timelines, and automated reports.",
  },
];

type HomePageProps = {
  onLogin?: () => void;
  onRegister?: () => void;
};

export default function HomePage({ onLogin, onRegister }: HomePageProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/taskmanager" className={styles.brand} aria-label="TaskManager home">
          <span className={styles.brandMark}>T</span>
          <span className={styles.brandName}>TaskManager</span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </nav>

        <div className={styles.actions}>
          <Link to="/taskmanager/login" className={styles.textLink}>
            Login
          </Link>
          <Link to="/taskmanager/register" className={styles.primaryButton}>
            Sign Up
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroContent}>
            <span className={styles.badge}>
              <i className="bi bi-dot" aria-hidden="true" />
              TASK MANAGEMENT 2.0
            </span>

            <h1>Manage tasks smarter, work together better.</h1>
            <p>
              TaskManager helps individuals and teams organize projects, assign tasks, track
              progress, and meet deadlines without the chaos.
            </p>

            <div className={styles.heroButtons}>
              <Link
                to="/taskmanager/login"
                className={styles.ctaPrimary}
                onClick={onLogin}
              >
                Get Started <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
              <Link
                to="/taskmanager/login"
                className={styles.ctaSecondary}
                onClick={onLogin}
              >
                Login
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.window}>
              <div className={styles.windowHeader}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>

              <div className={styles.board}>
                <div className={styles.boardColumn}>
                  <span className={styles.columnLabel} />
                  <div className={styles.card} />
                  <div className={styles.card} />
                </div>
                <div className={styles.boardColumn}>
                  <span className={styles.columnLabel} />
                  <div className={styles.card} />
                  <div className={styles.card} />
                </div>
                <div className={styles.boardColumn}>
                  <span className={styles.columnLabel} />
                  <div className={styles.card} />
                  <div className={styles.card} />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.features} id="features">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionTag}>Features</span>
            <h2>Everything you need to ship faster</h2>
            <p>Powerful features designed to help your team focus on execution rather than organization.</p>
          </div>

          <div className={styles.featureGrid}>
            {featureCards.map((item) => (
              <article className={styles.featureCard} key={item.title}>
                <div className={styles.featureIcon}>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.workflow} id="how-it-works">
          <div className={styles.sectionHeading}>
            <span className={styles.sectionTag}>How it works</span>
            <h2>Get up and running in minutes, not days.</h2>
          </div>

          <div className={styles.workflowGrid}>
            {steps.map((step) => (
              <article className={styles.stepCard} key={step.number}>
                <div className={styles.stepNumber}>{step.number}</div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ctaSection} id="about">
          <div className={styles.ctaPanel}>
            <div>
              <span className={styles.sectionTag}>About</span>
              <h2>Built to look like a real product from the first click.</h2>
              <p>
                The home page now works as the first screen in the app, while login and sign up stay
                one click away.
              </p>
            </div>

            <div className={styles.ctaButtons}>
              <Link
                to="/taskmanager/register"
                className={styles.ctaPrimary}
                onClick={onRegister}
              >
                Create Free Account
              </Link>
              <Link
                to="/taskmanager/login"
                className={styles.ctaSecondary}
                onClick={onLogin}
              >
                Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <strong>TaskManager</strong>
          <p>The modern standard for project management and team collaboration.</p>
        </div>

        <div className={styles.footerLinks}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#about">About</a>
        </div>
      </footer>
    </div>
  );
}
