import styles from "./ContentWrapper.module.css";

export default function ({ children }) {
  return <div className={styles.wrapper}>{children}</div>;
}