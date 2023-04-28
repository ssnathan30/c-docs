import styles from "./Header.module.css";

export default function ({ onClick }) {
  return (
    <div className={styles.wrapper}>
      <p className={styles.title} onClick={onClick}>
        C-Docs : A New Way to Collaborate
      </p>
    </div>
  );
}