import React from "react";
import { Link } from "react-router-dom";
import "../assets/styles/global.css";
import "../assets/styles/notfound-mospolyjob.css";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import image404 from "../assets/images/404.png";

export default function NotFound() {
  return (
    <div className="page-frame">
      <Header />

      <section className="notfound-wrap">
        <h1 className="notfound-title">Ой, такой страницы нет….</h1>

        <img src={image404} alt="404" className="notfound-image" />

        <p className="notfound-text">
          Она смогла найти работу мечты благодаря нашему сервису.
        </p>

        <p className="notfound-link">
          <Link to="/">Попробуйте и Вы.</Link>
        </p>
      </section>

      <Footer />
    </div>
  );
}
