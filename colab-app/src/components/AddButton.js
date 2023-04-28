import styles from "./AddButton.module.css";

export default function AddButton({ onClick }) {
  return (
    <div className={styles.wrapper} onClick={onClick}>
      <p className={styles.sign}>+</p>
    </div>
  );
}