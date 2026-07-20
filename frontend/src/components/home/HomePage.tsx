import { Link } from "react-router-dom";
import styles from "./HomePage.clean.module.css";

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
      </main>
    </div>
  );
}
