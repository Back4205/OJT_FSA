import { Link } from "react-router-dom";
import styles from "./HomePage.clean.module.css";

const roleCards = [
  {
    icon: "bi-shield-lock",
    title: "Sadmin",
    text: "Manage users, workspaces and platform-wide rules.",
  },
  {
    icon: "bi-person",
    title: "Member",
    text: "Focus on assigned tasks, boards and updates.",
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
          <span className={styles.brandMark}>
            <i className="bi bi-stars" aria-hidden="true" />
          </span>
          <span className={styles.brandText}>
            <strong>Flowspace</strong>
            <small>TASK OS</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <a href="#roles">Product</a>
          <a href="#roles">Customers</a>
          <a href="#roles">Pricing</a>
          <a href="#roles">Docs</a>
        </nav>

        <div className={styles.actions}>
          <Link to="/taskmanager/login" className={styles.textLink} onClick={onLogin}>
            Sign in
          </Link>
          <Link to="/taskmanager/register" className={styles.primaryButton} onClick={onRegister}>
            Get started
          </Link>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroTopBadge}>
            <span className={styles.badgeDot} />
            <span>Now with AI project planning</span>
          </div>

          <div className={styles.heroContent}>
            <h1>
              <span>The task platform that</span>
              <span className={styles.heroAccent}>runs your entire team.</span>
            </h1>

            <p>
              Plan projects, assign work, track deadlines and celebrate wins
              <span> all in one beautifully simple workspace built for modern teams.</span>
            </p>

            <div className={styles.heroButtons}>
              <Link to="/taskmanager/register" className={styles.ctaPrimary} onClick={onRegister}>
                Start free trial <i className="bi bi-arrow-right" aria-hidden="true" />
              </Link>
              <Link to="/taskmanager/login" className={styles.ctaSecondary} onClick={onLogin}>
                Sign in
              </Link>
            </div>

            <div className={styles.trustRow} aria-label="Highlights">
              <span>
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                No credit card
              </span>
              <span>
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                Free for up to 10 users
              </span>
              <span>
                <i className="bi bi-check-circle-fill" aria-hidden="true" />
                Built for teams
              </span>
            </div>
          </div>
        </section>

        <section className={styles.rolesSection} id="roles">
          <div className={styles.rolesLabel}>Explore by role</div>

          <div className={styles.roleGrid}>
            {roleCards.map((card) => (
              <article className={styles.roleCard} key={card.title}>
                <div className={styles.roleIcon}>
                  <i className={`bi ${card.icon}`} aria-hidden="true" />
                </div>
                <h2>{card.title}</h2>
                <p>{card.text}</p>
              </article>
            ))}
          </div>

          <div className={styles.bottomDock} aria-hidden="true">
            <button type="button" className={styles.dockButton}>
              <i className="bi bi-arrows-move" />
            </button>
            <button type="button" className={styles.dockButton}>
              <i className="bi bi-type" />
            </button>
            <button type="button" className={styles.dockButton}>
              <i className="bi bi-link-45deg" />
            </button>
            <button type="button" className={styles.dockButton}>
              <i className="bi bi-chat-square-dots" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
