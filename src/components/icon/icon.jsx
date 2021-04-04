import React from 'react';
import cn from "classnames";
import styles from "./icon.module.css";
import sprite from "../../assets/icon-sprite.svg";


export default function Icon({ name = "menu", className, size = "s" }) {
  return <svg className={cn(styles.icon, styles[`size_${size}`], className)}>
    <use xlinkHref={`${sprite}#${name}`}></use>
  </svg >
};